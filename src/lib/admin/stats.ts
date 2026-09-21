import type {
  Activity,
  AdminStats,
  AdminTrend,
  AdminUserSummary,
  Challenge,
  User,
} from "@/types";
import { challengeScoring, challengeStatus } from "@/lib/challenges/scoring";

/** Just the fields the aggregation actually needs from an activity. */
type ActivityForStats = Pick<Activity, "uid" | "source" | "startDate">;

const WEEKS_OF_ACTIVITY_HISTORY = 8;

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
    newUsersTrend: trend(
      users.map((u) => u.createdAt),
      today,
      7
    ),
    activitiesTrend: trend(
      allActivities.map((a) => a.startDate),
      today,
      7
    ),
    weeklyActivity: buildWeeklyActivity(allActivities, today, WEEKS_OF_ACTIVITY_HISTORY),
    activityByWeekday: buildActivityByWeekday(allActivities),
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

/** Counts `dates` in the last `windowDays` vs. the equal-length window before that. */
function trend(dates: string[], today: string, windowDays: number): AdminTrend {
  const current = dates.filter((d) => daysBetween(d, today) <= windowDays).length;
  const previous = dates.filter((d) => {
    const diff = daysBetween(d, today);
    return diff > windowDays && diff <= windowDays * 2;
  }).length;
  return {
    current,
    previous,
    deltaPct: previous === 0 ? null : round1(((current - previous) / previous) * 100),
  };
}

/** The Monday (UTC) of the ISO week `date` (YYYY-MM-DD) falls in. */
function weekStart(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  const day = d.getUTCDay(); // 0 = Sunday .. 6 = Saturday
  const diffToMonday = day === 0 ? 6 : day - 1;
  d.setUTCDate(d.getUTCDate() - diffToMonday);
  return d.toISOString().slice(0, 10);
}

/** Activity counts for the last `weeks` ISO weeks (Monday start), oldest first, zero-filled. */
function buildWeeklyActivity(
  activities: ActivityForStats[],
  today: string,
  weeks: number
): { weekStart: string; count: number }[] {
  const buckets = new Map<string, number>();
  const order: string[] = [];
  let cursor = weekStart(today);
  for (let i = 0; i < weeks; i++) {
    order.unshift(cursor);
    buckets.set(cursor, 0);
    const d = new Date(`${cursor}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - 7);
    cursor = d.toISOString().slice(0, 10);
  }

  for (const activity of activities) {
    const ws = weekStart(activity.startDate.slice(0, 10));
    if (buckets.has(ws)) {
      buckets.set(ws, (buckets.get(ws) ?? 0) + 1);
    }
  }

  return order.map((ws) => ({ weekStart: ws, count: buckets.get(ws) ?? 0 }));
}

/** Activity counts per weekday, index 0 = Sunday .. 6 = Saturday. */
function buildActivityByWeekday(activities: ActivityForStats[]): number[] {
  const counts = [0, 0, 0, 0, 0, 0, 0];
  for (const activity of activities) {
    const day = new Date(`${activity.startDate.slice(0, 10)}T00:00:00Z`).getUTCDay();
    counts[day]++;
  }
  return counts;
}
