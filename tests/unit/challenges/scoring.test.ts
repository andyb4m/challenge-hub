import { describe, it, expect } from "vitest";
import type { ChallengeMember } from "@/types";
import {
  challengeScoring,
  challengeStatus,
  formatScore,
  formatTotal,
  goalProgress,
  memberProgress,
  memberScore,
  memberTotalInUnit,
  rankMembers,
  rankMembersForChallenge,
} from "@/lib/challenges/scoring";
import { DEFAULT_ZONE_CONFIG } from "@/lib/challenges/zone";
import { VARIETY_KINDS } from "@/lib/challenges/variety";

function member(overrides: Partial<ChallengeMember>): ChallengeMember {
  return {
    uid: "u",
    displayName: "User",
    photoURL: null,
    joinedAt: "2026-07-01T00:00:00Z",
    totalDistance: 0,
    totalDuration: 0,
    activityCount: 0,
    ...overrides,
  };
}

describe("memberTotalInUnit", () => {
  const m = member({ totalDistance: 16093.44, totalDuration: 5400, activityCount: 3 });

  it("converts metres to km", () => {
    expect(memberTotalInUnit(m, "distance_km")).toBeCloseTo(16.09344);
  });

  it("converts metres to miles", () => {
    expect(memberTotalInUnit(m, "distance_miles")).toBeCloseTo(10);
  });

  it("converts seconds to minutes", () => {
    expect(memberTotalInUnit(m, "duration_minutes")).toBe(90);
  });

  it("uses activity count for count goals", () => {
    expect(memberTotalInUnit(m, "count")).toBe(3);
  });
});

describe("rankMembers", () => {
  const alice = member({ uid: "a", totalDistance: 75000, totalDuration: 10000, activityCount: 2 });
  const bob = member({ uid: "b", totalDistance: 50000, totalDuration: 30000, activityCount: 9 });
  const charlie = member({ uid: "c", totalDistance: 60000, totalDuration: 20000, activityCount: 5 });
  const members = [bob, alice, charlie];

  it("ranks by distance for distance goals", () => {
    expect(rankMembers(members, "distance_km").map((m) => m.uid)).toEqual(["a", "c", "b"]);
  });

  it("ranks by duration for duration goals", () => {
    expect(rankMembers(members, "duration_minutes").map((m) => m.uid)).toEqual(["b", "c", "a"]);
  });

  it("ranks by activity count for count goals", () => {
    expect(rankMembers(members, "count").map((m) => m.uid)).toEqual(["b", "c", "a"]);
  });

  it("does not mutate the original array", () => {
    const original = [...members];
    rankMembers(members, "distance_km");
    expect(members).toEqual(original);
  });

  it("handles an empty leaderboard", () => {
    expect(rankMembers([], "count")).toEqual([]);
  });
});

describe("goalProgress", () => {
  it("reports fraction of a distance goal", () => {
    const m = member({ totalDistance: 50000 });
    expect(goalProgress(m, { value: 100, unit: "distance_km" })).toBeCloseTo(0.5);
  });

  it("clamps at 1 when the goal is exceeded", () => {
    const m = member({ activityCount: 25 });
    expect(goalProgress(m, { value: 20, unit: "count" })).toBe(1);
  });

  it("returns 0 for a non-positive goal value", () => {
    expect(goalProgress(member({}), { value: 0, unit: "count" })).toBe(0);
  });
});

describe("memberScore / rankMembersForChallenge across challenge kinds", () => {
  const goalChallenge = {
    scoring: "goal" as const,
    goal: { value: 100, unit: "distance_km" as const },
    zoneConfig: null,
  };
  const zoneChallenge = {
    scoring: "zone" as const,
    goal: null,
    zoneConfig: DEFAULT_ZONE_CONFIG,
  };
  const varietyChallenge = {
    scoring: "variety" as const,
    goal: null,
    zoneConfig: null,
  };

  it("treats docs without a scoring field as goal challenges", () => {
    expect(challengeScoring({ scoring: undefined })).toBe("goal");
  });

  it("scores goal members by their total in the goal unit", () => {
    const m = member({ totalDistance: 42000 });
    expect(memberScore(goalChallenge, m)).toBeCloseTo(42);
    expect(formatScore(goalChallenge, m)).toBe("42 km");
  });

  it("scores zone members by effective points including the bonus", () => {
    const m = member({
      totalPoints: 100,
      zoneMinutes: { z2: 80, z3: 0, z4: 20, z5: 0 },
      recoveryCount: 0,
    });
    expect(memberScore(zoneChallenge, m)).toBe(115); // ×1.15 bonus
    expect(formatScore(zoneChallenge, m)).toBe("115 pts");
  });

  it("scores variety members by distinct kinds", () => {
    const m = member({ kinds: ["gym", "sup"] });
    expect(memberScore(varietyChallenge, m)).toBe(2);
    expect(formatScore(varietyChallenge, m)).toBe(
      `2/${VARIETY_KINDS.length} kinds`
    );
  });

  it("ranks zone members with the bonus applied", () => {
    const bonusMember = member({
      uid: "bonus",
      totalPoints: 100,
      zoneMinutes: { z2: 80, z3: 0, z4: 20, z5: 0 },
      recoveryCount: 0,
    }); // effective 115
    const rawMember = member({
      uid: "raw",
      totalPoints: 110,
      zoneMinutes: { z2: 0, z3: 0, z4: 100, z5: 0 },
      recoveryCount: 0,
    }); // effective 110
    const ranked = rankMembersForChallenge(zoneChallenge, [rawMember, bonusMember]);
    expect(ranked.map((m) => m.uid)).toEqual(["bonus", "raw"]);
  });

  it("measures zone progress relative to the leader", () => {
    const m = member({ totalPoints: 50, zoneMinutes: { z2: 0, z3: 0, z4: 50, z5: 0 } });
    expect(memberProgress(zoneChallenge, m, 200)).toBeCloseTo(0.25);
  });

  it("measures variety progress against the catalog size", () => {
    const m = member({ kinds: ["gym", "yoga", "sup"] });
    expect(memberProgress(varietyChallenge, m, 99)).toBeCloseTo(
      3 / VARIETY_KINDS.length
    );
  });
});

describe("challengeStatus", () => {
  const window = { startDate: "2026-07-01", endDate: "2026-07-31" };

  it("is upcoming before the start date", () => {
    expect(challengeStatus(window, "2026-06-30")).toBe("upcoming");
  });

  it("is active from start to end date inclusive", () => {
    expect(challengeStatus(window, "2026-07-01")).toBe("active");
    expect(challengeStatus(window, "2026-07-31")).toBe("active");
  });

  it("is ended after the end date", () => {
    expect(challengeStatus(window, "2026-08-01")).toBe("ended");
  });
});

describe("formatTotal", () => {
  it("formats km to one decimal", () => {
    expect(formatTotal(16.09344, "distance_km")).toBe("16.1 km");
  });

  it("formats durations as hours and minutes", () => {
    expect(formatTotal(90, "duration_minutes")).toBe("1h 30m");
    expect(formatTotal(45, "duration_minutes")).toBe("45m");
  });

  it("pluralises counts", () => {
    expect(formatTotal(1, "count")).toBe("1 activity");
    expect(formatTotal(12, "count")).toBe("12 activities");
  });
});
