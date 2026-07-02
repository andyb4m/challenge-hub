import { describe, it, expect } from "vitest";
import {
  buildManualActivity,
  buildNewChallenge,
  buildNewMember,
} from "@/lib/challenges/challenge-doc";
import type { CreateChallengeInput } from "@/types";

const now = new Date("2026-07-02T10:00:00Z");

const input: CreateChallengeInput = {
  name: "  July running  ",
  description: " Loser buys beers ",
  sportType: "Run",
  goal: { value: 100, unit: "distance_km" },
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

describe("buildNewChallenge", () => {
  it("builds the challenge doc with the creator as first member", () => {
    const challenge = buildNewChallenge(input, "uid-1", "token123", now);
    expect(challenge).toEqual({
      name: "July running",
      description: "Loser buys beers",
      sportType: "Run",
      goal: { value: 100, unit: "distance_km" },
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      createdBy: "uid-1",
      createdAt: "2026-07-02T10:00:00.000Z",
      inviteToken: "token123",
      memberCount: 1,
    });
  });
});

describe("buildNewMember", () => {
  it("starts a member with zeroed totals", () => {
    const memberDoc = buildNewMember(
      { uid: "uid-2", displayName: "Andreas", photoURL: null },
      now
    );
    expect(memberDoc).toEqual({
      uid: "uid-2",
      displayName: "Andreas",
      photoURL: null,
      joinedAt: "2026-07-02T10:00:00.000Z",
      totalDistance: 0,
      totalDuration: 0,
      activityCount: 0,
    });
  });
});

describe("buildManualActivity", () => {
  const challenge = { id: "ch-1", sportType: "Run" as const };

  it("converts km to metres and minutes to seconds", () => {
    const activity = buildManualActivity(
      { name: "Morning run", date: "2026-07-02", distanceKm: 5.2, durationMinutes: 31 },
      challenge,
      "uid-1",
      now
    );
    expect(activity.distance).toBe(5200);
    expect(activity.movingTime).toBe(1860);
    expect(activity.elapsedTime).toBe(1860);
  });

  it("is marked as manual with no Strava id", () => {
    const activity = buildManualActivity(
      { name: "Yoga", date: "2026-07-02", distanceKm: 0, durationMinutes: 60 },
      { id: "ch-2", sportType: "Yoga" },
      "uid-1",
      now
    );
    expect(activity.source).toBe("manual");
    expect(activity.stravaActivityId).toBeNull();
    expect(activity.sportType).toBe("Yoga");
    expect(activity.polyline).toBeNull();
  });

  it("pins the date-only entry to noon UTC", () => {
    const activity = buildManualActivity(
      { name: "Run", date: "2026-07-15", distanceKm: 1, durationMinutes: 10 },
      challenge,
      "uid-1",
      now
    );
    expect(activity.startDate).toBe("2026-07-15T12:00:00.000Z");
    expect(activity.startDate.slice(0, 10)).toBe("2026-07-15");
  });
});
