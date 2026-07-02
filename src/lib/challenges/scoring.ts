import type {
  Challenge,
  ChallengeGoal,
  ChallengeGoalUnit,
  ChallengeMember,
} from "@/types";

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
