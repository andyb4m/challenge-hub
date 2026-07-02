import type {
  Activity,
  Challenge,
  ChallengeMember,
  CreateChallengeInput,
  User,
} from "@/types";
import {
  DEFAULT_ZONE_CONFIG,
  zoneActivityMinutes,
  zoneActivityPoints,
  type ZoneActivityInput,
} from "@/lib/challenges/zone";

/** Everything for a new challenge doc except the Firestore-assigned id. */
export function buildNewChallenge(
  input: CreateChallengeInput,
  createdBy: string,
  inviteToken: string,
  now: Date = new Date()
): Omit<Challenge, "id"> {
  const isGoal = input.scoring === "goal";
  return {
    name: input.name.trim(),
    description: input.description.trim(),
    scoring: input.scoring,
    sportType: isGoal ? input.sportType : null,
    goal: isGoal ? input.goal : null,
    // Rules are frozen onto the doc so future default changes don't
    // rewrite running/finished challenges
    zoneConfig: input.scoring === "zone" ? DEFAULT_ZONE_CONFIG : null,
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
  scoring: Challenge["scoring"] = "goal",
  now: Date = new Date()
): ChallengeMember {
  const base: ChallengeMember = {
    uid: profile.uid,
    displayName: profile.displayName,
    photoURL: profile.photoURL,
    joinedAt: now.toISOString(),
    totalDistance: 0,
    totalDuration: 0,
    activityCount: 0,
  };
  if (scoring === "zone") {
    return {
      ...base,
      totalPoints: 0,
      zoneMinutes: { z2: 0, z3: 0, z4: 0, z5: 0 },
      recoveryCount: 0,
    };
  }
  if (scoring === "variety") {
    return { ...base, kinds: [] };
  }
  return base;
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

const ZONE_KIND_NAMES = {
  "zone-training": "Zone training",
  others: "Workout",
  recovery: "Recovery",
} as const;

/** An entry in a zone (points) challenge, with its points computed. */
export function buildZoneActivity(
  input: ZoneActivityInput & { date: string },
  challenge: Pick<Challenge, "id" | "zoneConfig">,
  uid: string,
  now: Date = new Date()
): Omit<Activity, "id"> {
  const config = challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG;
  const seconds = Math.round(zoneActivityMinutes(input) * 60);
  return {
    challengeId: challenge.id,
    uid,
    source: "manual",
    stravaActivityId: null,
    name: ZONE_KIND_NAMES[input.kind],
    sportType: null,
    distance: 0,
    movingTime: seconds,
    elapsedTime: seconds,
    startDate: `${input.date}T12:00:00.000Z`,
    polyline: null,
    syncedAt: now.toISOString(),
    zoneKind: input.kind,
    zones: input.kind === "zone-training" ? input.zones : null,
    points: zoneActivityPoints(input, config),
  };
}

/** An entry in a variety challenge. */
export function buildVarietyActivity(
  input: { kindId: string; label: string; date: string },
  challengeId: string,
  uid: string,
  now: Date = new Date()
): Omit<Activity, "id"> {
  return {
    challengeId,
    uid,
    source: "manual",
    stravaActivityId: null,
    name: input.label,
    sportType: null,
    distance: 0,
    movingTime: 0,
    elapsedTime: 0,
    startDate: `${input.date}T12:00:00.000Z`,
    polyline: null,
    syncedAt: now.toISOString(),
    varietyKind: input.kindId,
  };
}
