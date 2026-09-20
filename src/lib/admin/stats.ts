import type { Activity, AdminStats, AdminUserSummary, Challenge, User } from "@/types";
import { challengeScoring, challengeStatus } from "@/lib/challenges/scoring";

/** Just the fields the aggregation actually needs from an activity. */
type ActivityForStats = Pick<Activity, "uid" | "source" | "startDate">;

/**
 * Pure aggregation over already-fetched Firestore data — no Firestore
 * access here, so this is unit-testable without mocking the Admin SDK.
 * The route handler (src/app/api/admin/dashboard/route.ts) does the
 * fetching and calls this.
 */
export function buildAdminDashboard(
  users: User[],
  challenges: Challenge[],
  activitiesByChallenge: Map<string, ActivityForStats[]>,
  today: string // YYYY-MM-DD
): { stats: AdminStats; userSummaries: AdminUserSummary[] } {
  const allActivities = [...activitiesByChallenge.values()].flat();

  const activityCountByUid = new Map<string, number>();
  const lastActivityByUid = new Map<string, string>();
  for (const activity of allActivities) {
    activityCountByUid.set(activity.uid, (activityCountByUid.get(activity.uid) ?? 0) + 1);
    const current = lastActivityByUid.get(activity.uid);
    const day = activity.startDate.slice(0, 10);
    if (!current || day > current) {
      lastActivityByUid.set(activity.uid, day);
    }
  }

  const statusCounts = { active: 0, upcoming: 0, ended: 0 };
  const challengesByType = { goal: 0, zone: 0, variety: 0 };
  let totalMembers = 0;
  let mostActiveChallenge: AdminStats["mostActiveChallenge"] = null;

  for (const challenge of challenges) {
    statusCounts[challengeStatus(challenge, today)]++;
    challengesByType[challengeScoring(challenge)]++;
    totalMembers += challenge.memberCount;

    const activityCount = activitiesByChallenge.get(challenge.id)?.length ?? 0;
    if (activityCount > 0 && (!mostActiveChallenge || activityCount > mostActiveChallenge.activityCount)) {
      mostActiveChallenge = { id: challenge.id, name: challenge.name, activityCount };
    }
  }

  const userSummaries: AdminUserSummary[] = users
    .map((user) => ({
      uid: user.uid,
      displayName: user.displayName,
      email: user.email,
      createdAt: user.createdAt,
      stravaConnected: user.strava !== null,
      challengeCount: user.challengeIds?.length ?? 0,
      activityCount: activityCountByUid.get(user.uid) ?? 0,
      lastActivityDate: lastActivityByUid.get(user.uid) ?? null,
    }))
    .sort((a, b) => {
      // Most recently active first; never-active users sort last.
      if (a.lastActivityDate === b.lastActivityDate) return 0;
      if (!a.lastActivityDate) return 1;
      if (!b.lastActivityDate) return -1;
      return a.lastActivityDate < b.lastActivityDate ? 1 : -1;
    });

  const stats: AdminStats = {
    totalUsers: users.length,
    newUsersLast7Days: users.filter((u) => daysBetween(u.createdAt, today) <= 7).length,
    newUsersLast30Days: users.filter((u) => daysBetween(u.createdAt, today) <= 30).length,
    stravaConnectedUsers: users.filter((u) => u.strava !== null).length,
    totalChallenges: challenges.length,
    activeChallenges: statusCounts.active,
    upcomingChallenges: statusCounts.upcoming,
    endedChallenges: statusCounts.ended,
    challengesByType,
    avgMembersPerChallenge: challenges.length > 0 ? round1(totalMembers / challenges.length) : 0,
    totalActivities: allActivities.length,
    manualActivities: allActivities.filter((a) => a.source === "manual").length,
    stravaActivities: allActivities.filter((a) => a.source === "strava").length,
    usersActiveLast7Days: userSummaries.filter(
      (u) => u.lastActivityDate !== null && daysBetween(u.lastActivityDate, today) <= 7
    ).length,
    usersActiveLast30Days: userSummaries.filter(
      (u) => u.lastActivityDate !== null && daysBetween(u.lastActivityDate, today) <= 30
    ).length,
    mostActiveChallenge,
  };

  return { stats, userSummaries };
}

/** Whole days between two YYYY-MM-DD (or ISO-prefixed) dates, `today` assumed >= `date`. */
function daysBetween(date: string, today: string): number {
  const a = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  const b = Date.parse(`${today}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
