import type {
  Activity,
  Challenge,
  ChallengeMember,
  CreateChallengeInput,
  User,
} from "@/types";

/** Everything for a new challenge doc except the Firestore-assigned id. */
export function buildNewChallenge(
  input: CreateChallengeInput,
  createdBy: string,
  inviteToken: string,
  now: Date = new Date()
): Omit<Challenge, "id"> {
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    sportType: input.sportType,
    goal: input.goal,
    startDate: input.startDate,
    endDate: input.endDate,
    createdBy,
    createdAt: now.toISOString(),
    inviteToken,
    memberCount: 1, // the creator joins their own challenge immediately
  };
}

export function buildNewMember(
  profile: Pick<User, "uid" | "displayName" | "photoURL">,
  now: Date = new Date()
): ChallengeMember {
  return {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    joinedAt: now.toISOString(),
    totalDistance: 0,
    totalDuration: 0,
    activityCount: 0,
  };
}

export interface ManualActivityInput {
  name: string;
  date: string; // YYYY-MM-DD
  distanceKm: number; // 0 for non-distance activities
  durationMinutes: number;
}

/** A hand-logged activity, in the same shape Strava-synced ones will use. */
export function buildManualActivity(
  input: ManualActivityInput,
  challenge: Pick<Challenge, "id" | "sportType">,
  uid: string,
  now: Date = new Date()
): Omit<Activity, "id"> {
  const seconds = Math.round(input.durationMinutes * 60);
  return {
    challengeId: challenge.id,
    uid,
    source: "manual",
    stravaActivityId: null,
    name: input.name.trim(),
    sportType: challenge.sportType,
    distance: Math.round(input.distanceKm * 1000),
    movingTime: seconds,
    elapsedTime: seconds,
    startDate: `${input.date}T12:00:00.000Z`, // date-only entry, pinned to noon UTC
    polyline: null,
    syncedAt: now.toISOString(),
  };
}
