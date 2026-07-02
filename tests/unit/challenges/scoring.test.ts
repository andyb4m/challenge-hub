import { describe, it, expect } from "vitest";
import type { ChallengeMember } from "@/types";
import {
  challengeStatus,
  formatTotal,
  goalProgress,
  memberTotalInUnit,
  rankMembers,
} from "@/lib/challenges/scoring";

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
