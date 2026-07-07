import { FieldValue, type Firestore } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { Activity, Challenge, StravaActivity, User } from "@/types";
import { challengeScoring } from "@/lib/challenges/scoring";
import { isDateInChallengeWindow } from "@/lib/challenges/validation";
import {
  buildStravaGoalActivity,
  buildStravaZoneActivity,
} from "@/lib/challenges/challenge-doc";
import { mapStravaSportType } from "@/lib/strava/sport-type";
import { mapStravaHeartrateZones, type ZoneMinutes } from "@/lib/strava/zones";
import {
  fetchActivityZones,
  fetchRecentActivities,
  fetchStravaActivity,
  getValidToken,
} from "@/lib/strava/client";

// ---------------------------------------------------------------------------
// Pure decision logic — given already-fetched data, decide whether/how a
// Strava activity should sync into a given challenge. No Firestore here.
// ---------------------------------------------------------------------------

/** Decides whether a Strava activity counts toward a goal challenge. */
export function decideGoalActivity(
  stravaActivity: StravaActivity,
  challenge: Pick<
    Challenge,
    "id" | "scoring" | "sportType" | "startDate" | "endDate"
  >,
  uid: string
): Omit<Activity, "id"> | null {
  if (challengeScoring(challenge) !== "goal") return null;
  if (
    !isDateInChallengeWindow(stravaActivity.start_date.slice(0, 10), challenge)
  ) {
    return null;
  }
  if (mapStravaSportType(stravaActivity.sport_type) !== challenge.sportType) {
    return null;
  }
  return buildStravaGoalActivity(stravaActivity, challenge, uid);
}

/**
 * Decides whether a Strava activity counts toward a zone challenge.
 * `zones` is null when the activity has no heart-rate zone data — such
 * activities are skipped for zone challenges entirely (see zones.ts).
 */
export function decideZoneActivity(
  stravaActivity: StravaActivity,
  zones: ZoneMinutes | null,
  challenge: Pick<Challenge, "id" | "scoring" | "zoneConfig" | "startDate" | "endDate">,
  uid: string
): Omit<Activity, "id"> | null {
  if (challengeScoring(challenge) !== "zone") return null;
  if (!zones) return null;
  if (
    !isDateInChallengeWindow(stravaActivity.start_date.slice(0, 10), challenge)
  ) {
    return null;
  }
  return buildStravaZoneActivity(stravaActivity, zones, challenge, uid);
}

// ---------------------------------------------------------------------------
// Firestore orchestration (Admin SDK) — reconciles the decided state above
// against whatever's already stored, per challenge.
// ---------------------------------------------------------------------------

async function fetchUserChallenges(
  db: Firestore,
  challengeIds: string[]
): Promise<Challenge[]> {
  if (challengeIds.length === 0) return [];
  const snaps = await Promise.all(
    challengeIds.map((id) => db.collection(COLLECTIONS.challenges).doc(id).get())
  );
  return snaps
    .filter((snap) => snap.exists)
    .map((snap) => ({ id: snap.id, ...snap.data() }) as Challenge);
}

/** Query for existing Strava-synced activity doc(s) for this activity in a challenge. */
function existingActivityQuery(
  db: Firestore,
  challengeId: string,
  uid: string,
  stravaActivityId: number
) {
  return db
    .collection(COLLECTIONS.activities(challengeId))
    .where("stravaActivityId", "==", stravaActivityId)
    .where("uid", "==", uid);
}

/**
 * Reconciles a goal-challenge activity doc against the decided state:
 * removes any existing entry for this Strava activity (reversing its
 * contribution to member totals) and, if `decided` is non-null, creates
 * the fresh entry and applies its contribution.
 *
 * Runs as a Firestore transaction, not a plain batch: the read (is there
 * already an entry for this activity?) and the write must be atomic, or
 * two concurrent syncs for the same activity (e.g. two near-simultaneous
 * webhook deliveries) can both see "no existing entry" and both create
 * one, double-counting the activity's score. Firestore automatically
 * retries the whole transaction if the read data changes before commit.
 */
async function reconcileGoalActivity(
  db: Firestore,
  challengeId: string,
  uid: string,
  stravaActivityId: number,
  decided: Omit<Activity, "id"> | null
): Promise<void> {
  const activitiesRef = db.collection(COLLECTIONS.activities(challengeId));
  const memberRef = db.doc(`${COLLECTIONS.members(challengeId)}/${uid}`);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(
      existingActivityQuery(db, challengeId, uid, stravaActivityId)
    );
    if (existing.empty && !decided) return;

    let distanceDelta = 0;
    let durationDelta = 0;
    let countDelta = 0;

    existing.docs.forEach((doc) => {
      const activity = doc.data() as Activity;
      tx.delete(doc.ref);
      distanceDelta -= activity.distance;
      durationDelta -= activity.movingTime;
      countDelta -= 1;
    });

    if (decided) {
      tx.set(activitiesRef.doc(), decided);
      distanceDelta += decided.distance;
      durationDelta += decided.movingTime;
      countDelta += 1;
    }

    if (distanceDelta !== 0 || durationDelta !== 0 || countDelta !== 0) {
      tx.update(memberRef, {
        totalDistance: FieldValue.increment(distanceDelta),
        totalDuration: FieldValue.increment(durationDelta),
        activityCount: FieldValue.increment(countDelta),
      });
    }
  });
}

/** Same idea as reconcileGoalActivity (including the transaction), but for zone-training entries. */
async function reconcileZoneActivity(
  db: Firestore,
  challengeId: string,
  uid: string,
  stravaActivityId: number,
  decided: Omit<Activity, "id"> | null
): Promise<void> {
  const activitiesRef = db.collection(COLLECTIONS.activities(challengeId));
  const memberRef = db.doc(`${COLLECTIONS.members(challengeId)}/${uid}`);

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(
      existingActivityQuery(db, challengeId, uid, stravaActivityId)
    );
    if (existing.empty && !decided) return;

    let durationDelta = 0;
    let countDelta = 0;
    let pointsDelta = 0;
    const zoneDelta = { z2: 0, z3: 0, z4: 0, z5: 0 };

    existing.docs.forEach((doc) => {
      const activity = doc.data() as Activity;
      const zones = activity.zones ?? { z2: 0, z3: 0, z4: 0, z5: 0 };
      tx.delete(doc.ref);
      durationDelta -= activity.movingTime;
      countDelta -= 1;
      pointsDelta -= activity.points ?? 0;
      zoneDelta.z2 -= zones.z2;
      zoneDelta.z3 -= zones.z3;
      zoneDelta.z4 -= zones.z4;
      zoneDelta.z5 -= zones.z5;
    });

    if (decided) {
      const zones = decided.zones ?? { z2: 0, z3: 0, z4: 0, z5: 0 };
      tx.set(activitiesRef.doc(), decided);
      durationDelta += decided.movingTime;
      countDelta += 1;
      pointsDelta += decided.points ?? 0;
      zoneDelta.z2 += zones.z2;
      zoneDelta.z3 += zones.z3;
      zoneDelta.z4 += zones.z4;
      zoneDelta.z5 += zones.z5;
    }

    if (
      durationDelta !== 0 ||
      countDelta !== 0 ||
      pointsDelta !== 0 ||
      zoneDelta.z2 !== 0 ||
      zoneDelta.z3 !== 0 ||
      zoneDelta.z4 !== 0 ||
      zoneDelta.z5 !== 0
    ) {
      tx.update(memberRef, {
        totalDuration: FieldValue.increment(durationDelta),
        activityCount: FieldValue.increment(countDelta),
        totalPoints: FieldValue.increment(pointsDelta),
        "zoneMinutes.z2": FieldValue.increment(zoneDelta.z2),
        "zoneMinutes.z3": FieldValue.increment(zoneDelta.z3),
        "zoneMinutes.z4": FieldValue.increment(zoneDelta.z4),
        "zoneMinutes.z5": FieldValue.increment(zoneDelta.z5),
      });
    }
  });
}

/** Reconciles decided=null (removal) across every goal/zone challenge in the list. */
async function removeFromAllChallenges(
  db: Firestore,
  challenges: Challenge[],
  uid: string,
  stravaActivityId: number
): Promise<void> {
  for (const challenge of challenges) {
    if (challengeScoring(challenge) === "goal") {
      await reconcileGoalActivity(db, challenge.id, uid, stravaActivityId, null);
    } else if (challengeScoring(challenge) === "zone") {
      await reconcileZoneActivity(db, challenge.id, uid, stravaActivityId, null);
    }
  }
}

async function refreshAndPersistTokens(
  db: Firestore,
  uid: string,
  strava: NonNullable<User["strava"]>
) {
  const tokens = await getValidToken({
    accessToken: strava.accessToken,
    refreshToken: strava.refreshToken,
    expiresAt: strava.expiresAt,
  });
  if (tokens.accessToken !== strava.accessToken) {
    await db.collection(COLLECTIONS.users).doc(uid).update({
      "strava.accessToken": tokens.accessToken,
      "strava.refreshToken": tokens.refreshToken,
      "strava.expiresAt": tokens.expiresAt,
    });
  }
  return tokens;
}

/**
 * Finds the Challenge Hub uid connected to a Strava athlete id, for
 * resolving webhook events (which only carry the athlete's Strava id,
 * never our uid).
 */
export async function findUidByAthleteId(
  athleteId: number
): Promise<string | null> {
  const db = adminDb();
  const snap = await db
    .collection(COLLECTIONS.users)
    .where("strava.athleteId", "==", athleteId)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0].id;
}

/**
 * Syncs one Strava activity into every one of the user's goal/zone
 * challenges it applies to (variety challenges stay manual-only). Safe
 * to call repeatedly for the same activity — each challenge's entry is
 * fully reconciled (created, updated, or left alone) against current
 * Strava data every time.
 */
export async function syncStravaActivity(
  uid: string,
  stravaActivityId: number
): Promise<void> {
  const db = adminDb();
  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as User;
  if (!user.strava) return;

  const tokens = await refreshAndPersistTokens(db, uid, user.strava);
  const activity = await fetchStravaActivity(tokens.accessToken, stravaActivityId);

  const challenges = await fetchUserChallenges(db, user.challengeIds ?? []);
  if (challenges.length === 0) return;

  // Strava confirms this activity no longer exists (e.g. a create/update
  // event arrived for something already deleted) - clean up any stale
  // entries instead of leaving them stuck.
  if (!activity) {
    await removeFromAllChallenges(db, challenges, uid, stravaActivityId);
    return;
  }

  if (activity.athlete.id !== user.strava.athleteId) return; // defensive

  const needsZones = challenges.some((c) => challengeScoring(c) === "zone");
  const zones = needsZones
    ? mapStravaHeartrateZones(
        await fetchActivityZones(tokens.accessToken, stravaActivityId)
      )
    : null;

  for (const challenge of challenges) {
    if (challengeScoring(challenge) === "goal") {
      const decided = decideGoalActivity(activity, challenge, uid);
      await reconcileGoalActivity(db, challenge.id, uid, stravaActivityId, decided);
    } else if (challengeScoring(challenge) === "zone") {
      const decided = decideZoneActivity(activity, zones, challenge, uid);
      await reconcileZoneActivity(db, challenge.id, uid, stravaActivityId, decided);
    }
  }
}

/**
 * Removes a deleted Strava activity from every challenge that had it.
 *
 * Strava's webhook delete events carry no signature, so the claim isn't
 * trusted at face value: this re-fetches the activity from Strava first
 * and only proceeds if it's genuinely gone (404). Without this check, a
 * forged delete event for any known stravaActivityId (visible to fellow
 * challenge members via the activity feed's Strava link) could silently
 * strip a real, still-existing activity from someone else's totals.
 */
export async function removeStravaActivity(
  uid: string,
  stravaActivityId: number
): Promise<void> {
  const db = adminDb();
  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as User;
  if (!user.strava) return;

  const tokens = await refreshAndPersistTokens(db, uid, user.strava);
  const stillExists = await fetchStravaActivity(tokens.accessToken, stravaActivityId);
  if (stillExists) return; // forged or incorrect delete claim - ignore it

  const challenges = await fetchUserChallenges(db, user.challengeIds ?? []);
  await removeFromAllChallenges(db, challenges, uid, stravaActivityId);
}

/**
 * Pulls recent Strava activities (since the earliest start date among the
 * user's goal/zone challenges) and syncs each one. Run once right after
 * connecting Strava, so activities logged before the connection still
 * count. Re-fetches each activity individually via syncStravaActivity for
 * one shared code path — slightly more Strava API calls than strictly
 * necessary, but this only runs on connect, not per-request.
 */
export async function backfillStravaActivities(uid: string): Promise<void> {
  const db = adminDb();
  const userSnap = await db.collection(COLLECTIONS.users).doc(uid).get();
  if (!userSnap.exists) return;
  const user = userSnap.data() as User;
  if (!user.strava) return;

  const challenges = await fetchUserChallenges(db, user.challengeIds ?? []);
  const relevant = challenges.filter((c) => challengeScoring(c) !== "variety");
  if (relevant.length === 0) return;

  const earliestStart = relevant.reduce(
    (min, c) => (c.startDate < min ? c.startDate : min),
    relevant[0].startDate
  );
  const afterTimestamp = Math.floor(
    new Date(`${earliestStart}T00:00:00Z`).getTime() / 1000
  );

  const tokens = await refreshAndPersistTokens(db, uid, user.strava);
  const activities = await fetchRecentActivities(tokens.accessToken, afterTimestamp);

  for (const activity of activities) {
    await syncStravaActivity(uid, activity.id);
  }
}
