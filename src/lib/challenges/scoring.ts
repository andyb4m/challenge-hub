import type {
  Challenge,
  ChallengeGoal,
  ChallengeGoalUnit,
  ChallengeMember,
  ChallengeScoring,
} from "@/types";
import { DEFAULT_ZONE_CONFIG, effectiveZonePoints } from "@/lib/challenges/zone";
import { VARIETY_KINDS, varietyScore } from "@/lib/challenges/variety";

/**
 * Docs created before zone/variety challenges existed have no scoring
 * field — they are all goal challenges.
 */
export function challengeScoring(
  challenge: Pick<Challenge, "scoring">
): ChallengeScoring {
  return challenge.scoring ?? "goal";
}

/**
 * A member's score for ANY challenge kind — the single source of truth
 * for leaderboard order.
 */
export function memberScore(
  challenge: Pick<Challenge, "scoring" | "goal" | "zoneConfig">,
  member: ChallengeMember
): number {
  switch (challengeScoring(challenge)) {
    case "goal":
      return memberTotalInUnit(member, challenge.goal?.unit ?? "count");
    case "zone":
      return effectiveZonePoints(member, challenge.zoneConfig ?? DEFAULT_ZONE_CONFIG);
    case "variety":
      return varietyScore(member);
  }
}

/** Leaderboard order for any challenge kind: highest score first. */
export function rankMembersForChallenge(
  challenge: Pick<Challenge, "scoring" | "goal" | "zoneConfig">,
  members: ChallengeMember[]
): ChallengeMember[] {
  return [...members].sort(
    (a, b) => memberScore(challenge, b) - memberScore(challenge, a)
  );
}

/**
 * Progress fraction [0, 1] for the member's bar. Goal challenges measure
 * against the goal; variety against the full catalog; zone against the
 * current leader (relative — there is no fixed points target).
 */
export function memberProgress(
  challenge: Pick<Challenge, "scoring" | "goal" | "zoneConfig">,
  member: ChallengeMember,
  leaderScore: number
): number {
  const score = memberScore(challenge, member);
  switch (challengeScoring(challenge)) {
    case "goal":
      return challenge.goal ? goalProgress(member, challenge.goal) : 0;
    case "zone":
      return leaderScore > 0 ? Math.min(score / leaderScore, 1) : 0;
    case "variety":
      return Math.min(score / VARIETY_KINDS.length, 1);
  }
}

/** Right-hand score label on a leaderboard row. */
export function formatScore(
  challenge: Pick<Challenge, "scoring" | "goal" | "zoneConfig">,
  member: ChallengeMember
): string {
  const score = memberScore(challenge, member);
  switch (challengeScoring(challenge)) {
    case "goal":
      return formatTotal(score, challenge.goal?.unit ?? "count");
    case "zone":
      return `${score.toLocaleString()} pts`;
    case "variety":
      return `${score}/${VARIETY_KINDS.length} kinds`;
  }
}

const METRES_PER_KM = 1000;
const METRES_PER_MILE = 1609.344;

/**
 * A member's total in the challenge goal's unit. This single function decides
 * both leaderboard order and goal progress, so the two can never disagree.
 */
export function memberTotalInUnit(
  member: Pick<
    ChallengeMember,
    "totalDistance" | "totalDuration" | "activityCount"
  >,
  unit: ChallengeGoalUnit
): number {
  switch (unit) {
    case "distance_km":
      return member.totalDistance / METRES_PER_KM;
    case "distance_miles":
      return member.totalDistance / METRES_PER_MILE;
    case "duration_minutes":
      return member.totalDuration / 60;
    case "count":
      return member.activityCount;
  }
}

/** Leaderboard order: highest total in the goal's unit first. */
export function rankMembers(
  members: ChallengeMember[],
  unit: ChallengeGoalUnit
): ChallengeMember[] {
  return [...members].sort(
    (a, b) => memberTotalInUnit(b, unit) - memberTotalInUnit(a, unit)
  );
}

/** Fraction of the goal reached, clamped to [0, 1] for progress bars. */
export function goalProgress(
  member: ChallengeMember,
  goal: ChallengeGoal
): number {
  if (goal.value <= 0) return 0;
  return Math.min(memberTotalInUnit(member, goal.unit) / goal.value, 1);
}

export function formatTotal(value: number, unit: ChallengeGoalUnit): string {
  switch (unit) {
    case "distance_km":
      return `${(Math.round(value * 10) / 10).toLocaleString()} km`;
    case "distance_miles":
      return `${(Math.round(value * 10) / 10).toLocaleString()} mi`;
    case "duration_minutes": {
      const totalMinutes = Math.round(value);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    }
    case "count":
      return `${Math.round(value)} ${Math.round(value) === 1 ? "activity" : "activities"}`;
  }
}

export function formatGoal(goal: ChallengeGoal): string {
  return formatTotal(goal.value, goal.unit);
}

/** One-line description of what kind of challenge this is. */
export function challengeSummary(
  challenge: Pick<Challenge, "scoring" | "sportType" | "goal">
): string {
  switch (challengeScoring(challenge)) {
    case "goal":
      return `${challenge.sportType ?? "Sport"} · Goal: ${
        challenge.goal ? formatGoal(challenge.goal) : "—"
      }`;
    case "zone":
      return "Points challenge · HR zones, workouts & recovery + 80/20 bonus";
    case "variety":
      return `Variety challenge · most different sports (${VARIETY_KINDS.length} kinds)`;
  }
}

export type ChallengeStatus = "upcoming" | "active" | "ended";

export function challengeStatus(
  challenge: Pick<Challenge, "startDate" | "endDate">,
  today: string // YYYY-MM-DD
): ChallengeStatus {
  if (today < challenge.startDate) return "upcoming";
  if (today > challenge.endDate) return "ended";
  return "active";
}

/** Today as YYYY-MM-DD in the user's local timezone. */
export function localToday(now: Date = new Date()): string {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
