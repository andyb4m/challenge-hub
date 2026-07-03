"use client";

import {
  arrayUnion,
  collection,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  increment,
  orderBy,
  query,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type {
  Activity,
  Challenge,
  ChallengeMember,
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

/**
 * Looks up a challenge by its invite token via the server (Admin SDK), not
 * a client Firestore query — challenges/{id} reads are member-only, and a
 * non-member must be able to preview a challenge before joining it.
 */
export async function findChallengeByToken(
  token: string
): Promise<Challenge | null> {
  const res = await fetch(`/api/invite/${encodeURIComponent(token)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error("Failed to look up invite");
  return (await res.json()) as Challenge;
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

export interface RecentActivity {
  challengeId: string;
  challengeName: string;
  name: string;
  startDate: string;
}

/** Sum of the user's activityCount across all of their challenges. */
export async function fetchMyActivityCount(
  challengeIds: string[],
  uid: string
): Promise<number> {
  const db = firestoreDb();
  const snapshots = await Promise.all(
    challengeIds.map((id) => getDoc(doc(db, COLLECTIONS.members(id), uid)))
  );
  return snapshots.reduce((sum, snap) => {
    const member = snap.data() as ChallengeMember | undefined;
    return sum + (member?.activityCount ?? 0);
  }, 0);
}

/**
 * The user's most recent activity across all of their challenges. Fetches
 * each challenge's full activity feed (ordered by startDate, same
 * single-field index useActivities already relies on) and filters by uid
 * client-side, rather than a where+orderBy query, which would need a
 * composite index this project doesn't define.
 */
export async function fetchMyLastActivity(
  challenges: Pick<Challenge, "id" | "name">[],
  uid: string
): Promise<RecentActivity | null> {
  const db = firestoreDb();
  const perChallenge = await Promise.all(
    challenges.map(async (challenge) => {
      const snapshot = await getDocs(
        query(
          collection(db, COLLECTIONS.activities(challenge.id)),
          orderBy("startDate", "desc")
        )
      );
      const mineDoc = snapshot.docs.find((d) => (d.data() as Activity).uid === uid);
      if (!mineDoc) return null;
      const activity = mineDoc.data() as Activity;
      return {
        challengeId: challenge.id,
        challengeName: challenge.name,
        name: activity.name,
        startDate: activity.startDate,
      };
    })
  );

  const mine = perChallenge.filter((a): a is RecentActivity => a !== null);
  if (mine.length === 0) return null;
  return mine.reduce((latest, current) =>
    current.startDate > latest.startDate ? current : latest
  );
}
