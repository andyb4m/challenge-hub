import { describe, it, expect } from "vitest";
import {
  buildManualActivity,
  buildNewChallenge,
  buildNewMember,
  buildVarietyActivity,
  buildZoneActivity,
} from "@/lib/challenges/challenge-doc";
import { DEFAULT_ZONE_CONFIG } from "@/lib/challenges/zone";
import type { CreateChallengeInput } from "@/types";

const now = new Date("2026-07-02T10:00:00Z");

const goalInput: CreateChallengeInput = {
  name: "  July running  ",
  description: " Loser buys beers ",
  scoring: "goal",
  sportType: "Run",
  goal: { value: 100, unit: "distance_km" },
  varietyConfig: null,
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

describe("buildNewChallenge", () => {
  it("builds a goal challenge with the creator as first member", () => {
    const challenge = buildNewChallenge(goalInput, "uid-1", "token123", now);
    expect(challenge).toEqual({
      name: "July running",
      description: "Loser buys beers",
      scoring: "goal",
      sportType: "Run",
      goal: { value: 100, unit: "distance_km" },
      zoneConfig: null,
      varietyConfig: null,
      startDate: "2026-07-01",
      endDate: "2026-07-31",
      createdBy: "uid-1",
      createdAt: "2026-07-02T10:00:00.000Z",
      inviteToken: "token123",
      memberCount: 1,
    });
  });

  it("freezes the zone config onto zone challenges and clears sport/goal", () => {
    const challenge = buildNewChallenge(
      { ...goalInput, scoring: "zone" },
      "uid-1",
      "t",
      now
    );
    expect(challenge.zoneConfig).toEqual(DEFAULT_ZONE_CONFIG);
    expect(challenge.sportType).toBeNull();
    expect(challenge.goal).toBeNull();
  });

  it("builds a variety challenge carrying the creator's kind list", () => {
    const config = {
      kinds: [
        { id: "gym", label: "🏋️ Gym", maxCount: 2 },
        { id: "yoga", label: "🧘 Yoga", maxCount: 1 },
      ],
    };
    const challenge = buildNewChallenge(
      { ...goalInput, scoring: "variety", varietyConfig: config },
      "uid-1",
      "t",
      now
    );
    expect(challenge.scoring).toBe("variety");
    expect(challenge.sportType).toBeNull();
    expect(challenge.goal).toBeNull();
    expect(challenge.zoneConfig).toBeNull();
    expect(challenge.varietyConfig).toEqual(config);
  });
});

describe("buildNewMember", () => {
  const profile = { uid: "uid-2", displayName: "Andreas", photoURL: null };

  it("starts a goal-challenge member with zeroed base totals", () => {
    const memberDoc = buildNewMember(profile, "goal", now);
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

  it("adds zeroed point/zone fields for zone challenges", () => {
    const memberDoc = buildNewMember(profile, "zone", now);
    expect(memberDoc.totalPoints).toBe(0);
    expect(memberDoc.zoneMinutes).toEqual({ z2: 0, z3: 0, z4: 0, z5: 0 });
    expect(memberDoc.recoveryCount).toBe(0);
  });

  it("adds an empty kind-count map for variety challenges", () => {
    const memberDoc = buildNewMember(profile, "variety", now);
    expect(memberDoc.kindCounts).toEqual({});
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

describe("buildZoneActivity", () => {
  const challenge = { id: "ch-z", zoneConfig: DEFAULT_ZONE_CONFIG };

  it("computes points from zone minutes and stores the breakdown", () => {
    const activity = buildZoneActivity(
      {
        kind: "zone-training",
        date: "2026-07-02",
        zones: { z2: 30, z3: 0, z4: 10, z5: 5 },
      },
      challenge,
      "uid-1",
      now
    );
    // 30×1.0 + 0×0.5 + 10×1.5 + 5×2.0 = 55
    expect(activity.points).toBe(55);
    expect(activity.zoneKind).toBe("zone-training");
    expect(activity.zones).toEqual({ z2: 30, z3: 0, z4: 10, z5: 5 });
    expect(activity.movingTime).toBe(45 * 60);
    expect(activity.source).toBe("manual");
  });

  it("scores an others workout by tier", () => {
    const activity = buildZoneActivity(
      { kind: "others", date: "2026-07-02", tier: "60" },
      challenge,
      "uid-1",
      now
    );
    expect(activity.points).toBe(40);
    expect(activity.zones).toBeNull();
    expect(activity.movingTime).toBe(3600);
  });

  it("scores recovery flat", () => {
    const activity = buildZoneActivity(
      { kind: "recovery", date: "2026-07-02" },
      challenge,
      "uid-1",
      now
    );
    expect(activity.points).toBe(30);
    expect(activity.zoneKind).toBe("recovery");
  });

  it("falls back to default config when the doc has none", () => {
    const activity = buildZoneActivity(
      { kind: "others", date: "2026-07-02", tier: "30" },
      { id: "ch-old", zoneConfig: null },
      "uid-1",
      now
    );
    expect(activity.points).toBe(20);
  });
});

describe("buildVarietyActivity", () => {
  it("stores the kind id and label", () => {
    const activity = buildVarietyActivity(
      { kindId: "climbing", label: "🧗 Climbing", date: "2026-07-02" },
      "ch-v",
      "uid-1",
      now
    );
    expect(activity.varietyKind).toBe("climbing");
    expect(activity.name).toBe("🧗 Climbing");
    expect(activity.source).toBe("manual");
    expect(activity.distance).toBe(0);
  });
});
