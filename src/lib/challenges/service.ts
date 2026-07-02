"use client";

import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { firestoreDb } from "@/lib/firebase/client";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Activity, Challenge, User } from "@/types";
import type { CreateChallengeInput } from "@/types";
import { generateInviteToken } from "@/lib/challenges/invite";
import {
  buildManualActivity,
  buildNewChallenge,
  buildNewMember,
  type ManualActivityInput,
} from "@/lib/challenges/challenge-doc";

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
    buildNewMember(profile)
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
  challengeId: string,
  profile: MemberProfile
): Promise<void> {
  const db = firestoreDb();
  const batch = writeBatch(db);

  batch.set(
    doc(db, COLLECTIONS.members(challengeId), profile.uid),
    buildNewMember(profile)
  );
  batch.update(doc(db, COLLECTIONS.users, profile.uid), {
    challengeIds: arrayUnion(challengeId),
  });
  batch.update(doc(db, COLLECTIONS.challenges, challengeId), {
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

export async function deleteManualActivity(activity: Activity): Promise<void> {
  const db = firestoreDb();
  const batch = writeBatch(db);

  batch.delete(doc(db, COLLECTIONS.activities(activity.challengeId), activity.id));
  batch.update(doc(db, COLLECTIONS.members(activity.challengeId), activity.uid), {
    totalDistance: increment(-activity.distance),
    totalDuration: increment(-activity.movingTime),
    activityCount: increment(-1),
  });

  await batch.commit();
}
