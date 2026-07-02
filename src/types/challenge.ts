export type SportType =
  | "Run"
  | "Ride"
  | "Swim"
  | "Walk"
  | "Hike"
  | "WeightTraining"
  | "Yoga"
  | "Other";

export type ChallengeGoalUnit =
  | "distance_km"
  | "distance_miles"
  | "duration_minutes"
  | "count";

export interface ChallengeGoal {
  value: number;
  unit: ChallengeGoalUnit;
}

/**
 * The three challenge formats:
 * - "goal":    one sport, race to a target (km / miles / minutes / count)
 * - "zone":    points from HR-zone minutes × multipliers + flat-point
 *              activity types + the 80/20 low-intensity bonus
 *              (the SummerFit model — docs/legacy-summerfit-handoff.md §3)
 * - "variety": most *different* activity kinds in the window; each kind
 *              counts once
 */
export type ChallengeScoring = "goal" | "zone" | "variety";

/**
 * Zone-challenge rules, stored on the challenge doc at creation so old
 * challenges keep their original rules if defaults evolve.
 */
export interface ZoneConfig {
  /** points per minute in each HR zone */
  multipliers: { z2: number; z3: number; z4: number; z5: number };
  /** flat points for "Others" activities by duration tier */
  othersPoints: { thirtyMin: number; sixtyMin: number };
  /** flat points per recovery activity (max one per calendar week) */
  recoveryPoints: number;
  /** ×bonus on total points when low-intensity share is within [low, high] */
  bonus: { low: number; high: number; multiplier: number };
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  /**
   * Absent on docs created before zone/variety challenges existed —
   * read via challengeScoring(), which defaults to "goal".
   */
  scoring?: ChallengeScoring;
  /** goal challenges only; null for zone/variety */
  sportType: SportType | null;
  /** goal challenges only; null for zone/variety */
  goal: ChallengeGoal | null;
  /** zone challenges only */
  zoneConfig?: ZoneConfig | null;
  startDate: string; // ISO 8601 date (YYYY-MM-DD)
  endDate: string;   // ISO 8601 date (YYYY-MM-DD)
  createdBy: string; // uid
  createdAt: string; // ISO 8601
  inviteToken: string;
  memberCount: number;
}

export interface ChallengeMember {
  uid: string;
  displayName: string;
  photoURL: string | null;
  joinedAt: string; // ISO 8601
  totalDistance: number; // metres
  totalDuration: number; // seconds
  activityCount: number;
  /** zone challenges: raw points before the 80/20 bonus */
  totalPoints?: number;
  /** zone challenges: decimal minutes per zone (drives the 80/20 ratio) */
  zoneMinutes?: { z2: number; z3: number; z4: number; z5: number };
  /** zone challenges: number of recovery activities logged */
  recoveryCount?: number;
  /** variety challenges: distinct activity kind ids already counted */
  kinds?: string[];
}

export interface CreateChallengeInput {
  name: string;
  description: string;
  scoring: ChallengeScoring;
  /** required when scoring === "goal" */
  sportType: SportType | null;
  /** required when scoring === "goal" */
  goal: ChallengeGoal | null;
  startDate: string;
  endDate: string;
}
