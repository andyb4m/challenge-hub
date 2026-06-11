import { describe, it, expect } from "vitest";
import type { ChallengeMember } from "@/types";

function rankByDistance(members: ChallengeMember[]): ChallengeMember[] {
  return [...members].sort((a, b) => b.totalDistance - a.totalDistance);
}

describe("challenge scoring — distance ranking", () => {
  const members: ChallengeMember[] = [
    { uid: "b", displayName: "Bob", photoURL: null, joinedAt: "2025-01-01T00:00:00Z", totalDistance: 50000, totalDuration: 18000, activityCount: 5 },
    { uid: "a", displayName: "Alice", photoURL: null, joinedAt: "2025-01-01T00:00:00Z", totalDistance: 75000, totalDuration: 27000, activityCount: 7 },
    { uid: "c", displayName: "Charlie", photoURL: null, joinedAt: "2025-01-01T00:00:00Z", totalDistance: 60000, totalDuration: 21600, activityCount: 6 },
  ];

  it("ranks members by distance descending", () => {
    const ranked = rankByDistance(members);
    expect(ranked.map((m) => m.uid)).toEqual(["a", "c", "b"]);
  });

  it("does not mutate the original array", () => {
    const original = [...members];
    rankByDistance(members);
    expect(members).toEqual(original);
  });

  it("handles a single member", () => {
    expect(rankByDistance([members[0]])).toHaveLength(1);
  });

  it("handles an empty leaderboard", () => {
    expect(rankByDistance([])).toEqual([]);
  });
});
