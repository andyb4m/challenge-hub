"use client";

import {
  arrayUnion,
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type {
  Activity,
  Challenge,
  CreateChallengeInput,
  User,
  VarietyKindConfig,
} from "@/types";
import { generateInviteToken } from "@/lib/challenges/invite";
import {
  buildManualActivity,
  buildNewChallenge,
  buildNewMember,
  buildVarietyActivity,
  buildZoneActivity,
  type ManualActivityInput,
} from "@/lib/challenges/challenge-doc";
import { challengeScoring } from "@/lib/challenges/scoring";
import type { ZoneActivityInput } from "@/lib/challenges/zone";

type MemberProfile = Pick<User, "uid" | "displayName" | "photoURL">;

/**
 * Creates the challenge and enrols the creator as its first member,
 * atomically: challenge doc + member doc + challengeIds on the user doc.
 */
export async function createChallenge(
  input: CreateChallengeInput,
  profile: MemberProfile
): Promise<string> {
  const db = firestoreDb();
  const challengeRef = doc(collection(db, COLLECTIONS.challenges));
  const batch = writeBatch(db);

  batch.set(
    challengeRef,
    buildNewChallenge(input, profile.uid, generateInviteToken())
  );
  batch.set(
    doc(db, COLLECTIONS.members(challengeRef.id), profile.uid),
    buildNewMember(profile, input.scoring)
  );
  batch.update(doc(db, COLLECTIONS.users, profile.uid), {
    challengeIds: arrayUnion(challengeRef.id),
  });

  await batch.commit();
  return challengeRef.id;
}

export async function findChallengeByToken(
  token: string
): Promise<Challenge | null> {
  const snapshot = await getDocs(
    query(
      collection(firestoreDb(), COLLECTIONS.challenges),
      where("inviteToken", "==", token),
      limit(1)
    )
  );
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as Challenge;
}

/** Adds the user as a member. Callers check eligibility first. */
export async function joinChallenge(
  challenge: Pick<Challenge, "id" | "scoring">,
  profile: MemberProfile
): Promise<void> {
  const db = firestoreDb();
  const batch = writeBatch(db);

  batch.set(
    doc(db, COLLECTIONS.members(challenge.id), profile.uid),
    buildNewMember(profile, challengeScoring(challenge))
  );
  batch.update(doc(db, COLLECTIONS.users, profile.uid), {
    challengeIds: arrayUnion(challenge.id),
  });
  batch.update(doc(db, COLLECTIONS.challenges, challenge.id), {
    memberCount: increment(1),
  });

  await batch.commit();
}

/** One-shot fetch of the user's challenges (ids come from their user doc). */
export async function fetchChallengesByIds(
  challengeIds: string[]
): Promise<Challenge[]> {
  const db = firestoreDb();
  const snapshots = await Promise.all(
    challengeIds.map((id) => getDoc(doc(db, COLLECTIONS.challenges, id)))
  );
  return snapshots
    .filter((snap) => snap.exists())
    .map((snap) => ({ id: snap.id, ...snap.data() }) as Challenge);
}

/**
 * Writes the activity and updates the member's running totals atomically —
 * the same totals the Strava webhook will maintain server-side later.
 */
export async function logManualActivity(
  input: ManualActivityInput,
  challenge: Pick<Challenge, "id" | "sportType">,
  uid: string
): Promise<void> {
  const db = firestoreDb();
  const activity = buildManualActivity(input, challenge, uid);
  const batch = writeBatch(db);

  batch.set(doc(collection(db, COLLECTIONS.activities(challenge.id))), activity);
  batch.update(doc(db, COLLECTIONS.members(challenge.id), uid), {
    totalDistance: increment(activity.distance),
    totalDuration: increment(activity.movingTime),
    activityCount: increment(1),
  });

  await batch.commit();
}

/**
 * Writes a zone-challenge entry and updates the member's point/zone totals
 * atomically. The 80/20 bonus is derived from these totals at render time.
 */
export async function logZoneActivity(
  input: ZoneActivityInput & { date: string },
  challenge: Pick<Challenge, "id" | "zoneConfig">,
  uid: string
): Promise<void> {
  const db = firestoreDb();
  const activity = buildZoneActivity(input, challenge, uid);
  const zones = activity.zones ?? { z2: 0, z3: 0, z4: 0, z5: 0 };
  const batch = writeBatch(db);

  batch.set(doc(collection(db, COLLECTIONS.activities(challenge.id))), activity);
  batch.update(doc(db, COLLECTIONS.members(challenge.id), uid), {
    totalPoints: increment(activity.points ?? 0),
    totalDuration: increment(activity.movingTime),
    activityCount: increment(1),
    "zoneMinutes.z2": increment(zones.z2),
    "zoneMinutes.z3": increment(zones.z3),
    "zoneMinutes.z4": increment(zones.z4),
    "zoneMinutes.z5": increment(zones.z5),
    recoveryCount: increment(input.kind === "recovery" ? 1 : 0),
  });

  await batch.commit();
}

/**
 * Writes a variety-challenge entry and bumps the member's per-kind count.
 * Kind ids can contain hyphens, so the nested field uses FieldPath (string
 * dot-paths only allow identifier characters).
 */
export async function logVarietyActivity(
  input: { kindId: string; label: string; date: string },
  challengeId: string,
  uid: string
): Promise<void> {
  const db = firestoreDb();
  const activity = buildVarietyActivity(input, challengeId, uid);
  const batch = writeBatch(db);

  batch.set(doc(collection(db, COLLECTIONS.activities(challengeId))), activity);
  batch.update(
    doc(db, COLLECTIONS.members(challengeId), uid),
    new FieldPath("kindCounts", input.kindId),
    increment(1),
    "activityCount",
    increment(1)
  );

  await batch.commit();
}

/** Creator-only: replace the variety challenge's kind list. */
export async function updateVarietyKinds(
  challengeId: string,
  kinds: VarietyKindConfig[]
): Promise<void> {
  await updateDoc(doc(firestoreDb(), COLLECTIONS.challenges, challengeId), {
    varietyConfig: { kinds },
  });
}

/**
 * Deletes any manual entry and reverses its contribution to the member's
 * totals (including per-kind counts and zone/point totals).
 */
export async function deleteManualActivity(activity: Activity): Promise<void> {
  const db = firestoreDb();
  const zones = activity.zones ?? { z2: 0, z3: 0, z4: 0, z5: 0 };
  const memberRef = doc(
    db,
    COLLECTIONS.members(activity.challengeId),
    activity.uid
  );
  const batch = writeBatch(db);

  batch.delete(doc(db, COLLECTIONS.activities(activity.challengeId), activity.id));

  if (activity.varietyKind) {
    batch.update(
      memberRef,
      new FieldPath("kindCounts", activity.varietyKind),
      increment(-1),
      "activityCount",
      increment(-1)
    );
  } else {
    batch.update(memberRef, {
      totalDistance: increment(-activity.distance),
      totalDuration: increment(-activity.movingTime),
      activityCount: increment(-1),
      ...(activity.zoneKind
        ? {
            totalPoints: increment(-(activity.points ?? 0)),
            "zoneMinutes.z2": increment(-zones.z2),
            "zoneMinutes.z3": increment(-zones.z3),
            "zoneMinutes.z4": increment(-zones.z4),
            "zoneMinutes.z5": increment(-zones.z5),
            recoveryCount: increment(activity.zoneKind === "recovery" ? -1 : 0),
          }
        : {}),
    });
  }

  await batch.commit();
}
