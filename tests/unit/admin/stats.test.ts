import { describe, it, expect } from "vitest";
import { buildAdminDashboard } from "@/lib/admin/stats";
import type { Challenge, User } from "@/types";

const today = "2026-09-18";

function user(overrides: Partial<User> & { uid: string }): User {
  return {
    displayName: "User",
    email: `${overrides.uid}@example.com`,
    photoURL: null,
    createdAt: "2026-08-01T00:00:00.000Z",
    strava: null,
    challengeIds: [],
    ...overrides,
  };
}

function challenge(overrides: Partial<Challenge> & { id: string }): Challenge {
  return {
    name: "Challenge",
    description: "",
    scoring: "goal",
    sportType: "Run",
    goal: { value: 100, unit: "distance_km" },
    startDate: "2026-09-01",
    endDate: "2026-09-30",
    createdBy: "someone",
    createdAt: "2026-08-01T00:00:00.000Z",
    inviteToken: "tok",
    memberCount: 1,
    ...overrides,
  };
}

describe("buildAdminDashboard", () => {
  it("returns all-zero stats and no users for an empty app", () => {
    const { stats, userSummaries } = buildAdminDashboard([], [], new Map(), today);
    expect(stats).toMatchObject({
      totalUsers: 0,
      totalChallenges: 0,
      totalActivities: 0,
      avgMembersPerChallenge: 0,
      mostActiveChallenge: null,
    });
    expect(userSummaries).toEqual([]);
  });

  it("counts users, Strava connections, and challenge types", () => {
    const users = [
      user({ uid: "a", strava: { athleteId: 1, accessToken: "x", refreshToken: "y", expiresAt: 0, connectedAt: "2026-09-01T00:00:00.000Z" } }),
      user({ uid: "b" }),
    ];
    const challenges = [
      challenge({ id: "c1", scoring: "goal" }),
      challenge({ id: "c2", scoring: "zone" }),
      challenge({ id: "c3", scoring: "variety" }),
    ];
    const { stats } = buildAdminDashboard(users, challenges, new Map(), today);
    expect(stats.totalUsers).toBe(2);
    expect(stats.stravaConnectedUsers).toBe(1);
    expect(stats.totalChallenges).toBe(3);
    expect(stats.challengesByType).toEqual({ goal: 1, zone: 1, variety: 1 });
  });

  it("splits challenges by status (active/upcoming/ended)", () => {
    const challenges = [
      challenge({ id: "past", startDate: "2026-08-01", endDate: "2026-08-31" }),
      challenge({ id: "now", startDate: "2026-09-01", endDate: "2026-09-30" }),
      challenge({ id: "future", startDate: "2026-10-01", endDate: "2026-10-31" }),
    ];
    const { stats } = buildAdminDashboard([], challenges, new Map(), today);
    expect(stats.endedChallenges).toBe(1);
    expect(stats.activeChallenges).toBe(1);
    expect(stats.upcomingChallenges).toBe(1);
  });

  it("computes the average member count, rounded to 1 decimal", () => {
    const challenges = [
      challenge({ id: "c1", memberCount: 3 }),
      challenge({ id: "c2", memberCount: 4 }),
    ];
    const { stats } = buildAdminDashboard([], challenges, new Map(), today);
    expect(stats.avgMembersPerChallenge).toBe(3.5);
  });

  it("counts activities by source and per-user, across multiple challenges", () => {
    const users = [user({ uid: "a" }), user({ uid: "b" })];
    const challenges = [challenge({ id: "c1" }), challenge({ id: "c2" })];
    const activitiesByChallenge = new Map([
      [
        "c1",
        [
          { uid: "a", source: "manual" as const, startDate: "2026-09-10T00:00:00.000Z" },
          { uid: "a", source: "strava" as const, startDate: "2026-09-15T00:00:00.000Z" },
        ],
      ],
      ["c2", [{ uid: "b", source: "manual" as const, startDate: "2026-09-01T00:00:00.000Z" }]],
    ]);

    const { stats, userSummaries } = buildAdminDashboard(users, challenges, activitiesByChallenge, today);
    expect(stats.totalActivities).toBe(3);
    expect(stats.manualActivities).toBe(2);
    expect(stats.stravaActivities).toBe(1);

    const alice = userSummaries.find((u) => u.uid === "a")!;
    expect(alice.activityCount).toBe(2);
    expect(alice.lastActivityDate).toBe("2026-09-15"); // most recent of the two, not the last one pushed
  });

  it("treats exactly 7 and 30 days ago as within range, one day past as not", () => {
    const users = [
      user({ uid: "in7", createdAt: "2026-09-11T00:00:00.000Z" }), // exactly 7 days
      user({ uid: "out7", createdAt: "2026-09-10T00:00:00.000Z" }), // 8 days
      user({ uid: "in30", createdAt: "2026-08-19T00:00:00.000Z" }), // exactly 30 days
      user({ uid: "out30", createdAt: "2026-08-18T00:00:00.000Z" }), // 31 days
    ];
    const { stats } = buildAdminDashboard(users, [], new Map(), today);
    expect(stats.newUsersLast7Days).toBe(1);
    expect(stats.newUsersLast30Days).toBe(3); // in7 + in30, out7 is within 30 too
  });

  it("counts users active in the last 7/30 days based on their most recent activity", () => {
    const users = [user({ uid: "recent" }), user({ uid: "stale" }), user({ uid: "never" })];
    const activitiesByChallenge = new Map([
      [
        "c1",
        [
          { uid: "recent", source: "manual" as const, startDate: "2026-09-15T00:00:00.000Z" }, // 3 days ago
          { uid: "stale", source: "manual" as const, startDate: "2026-08-10T00:00:00.000Z" }, // 39 days ago
        ],
      ],
    ]);
    const { stats } = buildAdminDashboard(users, [], activitiesByChallenge, today);
    expect(stats.usersActiveLast7Days).toBe(1);
    expect(stats.usersActiveLast30Days).toBe(1);
  });

  it("finds the most active challenge, ignoring challenges with zero activities", () => {
    const challenges = [challenge({ id: "quiet" }), challenge({ id: "busy" })];
    const activitiesByChallenge = new Map([
      ["busy", [{ uid: "a", source: "manual" as const, startDate: "2026-09-10T00:00:00.000Z" }]],
    ]);
    const { stats } = buildAdminDashboard([], challenges, activitiesByChallenge, today);
    expect(stats.mostActiveChallenge).toEqual({ id: "busy", name: "Challenge", activityCount: 1 });
  });

  it("sorts users by most recently active first, never-active users last", () => {
    const users = [user({ uid: "never" }), user({ uid: "old" }), user({ uid: "recent" })];
    const activitiesByChallenge = new Map([
      [
        "c1",
        [
          { uid: "old", source: "manual" as const, startDate: "2026-09-01T00:00:00.000Z" },
          { uid: "recent", source: "manual" as const, startDate: "2026-09-17T00:00:00.000Z" },
        ],
      ],
    ]);
    const { userSummaries } = buildAdminDashboard(users, [], activitiesByChallenge, today);
    expect(userSummaries.map((u) => u.uid)).toEqual(["recent", "old", "never"]);
  });

  it("computes a new-users trend against the previous 7-day window", () => {
    const users = [
      user({ uid: "a", createdAt: "2026-09-15T00:00:00.000Z" }), // 3 days ago -> current
      user({ uid: "b", createdAt: "2026-09-05T00:00:00.000Z" }), // 13 days ago -> previous
      user({ uid: "c", createdAt: "2026-08-01T00:00:00.000Z" }), // outside both windows
    ];
    const { stats } = buildAdminDashboard(users, [], new Map(), today);
    expect(stats.newUsersTrend).toEqual({ current: 1, previous: 1, deltaPct: 0 });
  });

  it("returns a null deltaPct when there's no previous-period baseline", () => {
    const users = [user({ uid: "a", createdAt: "2026-09-17T00:00:00.000Z" })];
    const { stats } = buildAdminDashboard(users, [], new Map(), today);
    expect(stats.newUsersTrend).toEqual({ current: 1, previous: 0, deltaPct: null });
  });

  it("computes an activities trend against the previous 7-day window", () => {
    const activitiesByChallenge = new Map([
      [
        "c1",
        [
          { uid: "a", source: "manual" as const, startDate: "2026-09-16T00:00:00.000Z" }, // 2 days ago
          { uid: "a", source: "manual" as const, startDate: "2026-09-05T00:00:00.000Z" }, // 13 days ago
        ],
      ],
    ]);
    const { stats } = buildAdminDashboard([], [], activitiesByChallenge, today);
    expect(stats.activitiesTrend).toEqual({ current: 1, previous: 1, deltaPct: 0 });
  });

  it("returns 8 zero-filled weeks in ascending order when there's no activity", () => {
    const { stats } = buildAdminDashboard([], [], new Map(), today);
    expect(stats.weeklyActivity).toHaveLength(8);
    expect(stats.weeklyActivity.every((w) => w.count === 0)).toBe(true);
    const starts = stats.weeklyActivity.map((w) => w.weekStart);
    expect([...starts].sort()).toEqual(starts);
  });

  it("buckets an activity into the Monday-start week it falls in", () => {
    const activitiesByChallenge = new Map([
      [
        "c1",
        [{ uid: "a", source: "manual" as const, startDate: "2026-09-16T00:00:00.000Z" }],
      ],
    ]);
    const { stats } = buildAdminDashboard([], [], activitiesByChallenge, today);
    const nonZero = stats.weeklyActivity.filter((w) => w.count > 0);
    expect(nonZero).toHaveLength(1);
    expect(nonZero[0].count).toBe(1);
  });

  it("returns 7 zero weekday counts when there's no activity", () => {
    const { stats } = buildAdminDashboard([], [], new Map(), today);
    expect(stats.activityByWeekday).toEqual([0, 0, 0, 0, 0, 0, 0]);
  });

  it("buckets an activity's date into its weekday (UTC)", () => {
    const startDate = "2026-09-16T00:00:00.000Z";
    const expectedDay = new Date(startDate).getUTCDay();
    const activitiesByChallenge = new Map([
      ["c1", [{ uid: "a", source: "manual" as const, startDate }]],
    ]);
    const { stats } = buildAdminDashboard([], [], activitiesByChallenge, today);
    expect(stats.activityByWeekday[expectedDay]).toBe(1);
    expect(stats.activityByWeekday.reduce((a, b) => a + b, 0)).toBe(1);
  });
});
