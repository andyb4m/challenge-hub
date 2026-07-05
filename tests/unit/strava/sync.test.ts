import { describe, it, expect } from "vitest";
import { decideGoalActivity, decideZoneActivity } from "@/lib/strava/sync";
import type { StravaActivity } from "@/types";

const runActivity: StravaActivity = {
  id: 999,
  name: "Morning Run",
  type: "Run",
  sport_type: "Run",
  distance: 5000,
  moving_time: 1500,
  elapsed_time: 1600,
  start_date: "2026-07-15T06:00:00Z",
  map: { summary_polyline: "poly" },
  athlete: { id: 42 },
};

const goalChallenge = {
  id: "ch-goal",
  scoring: "goal" as const,
  sportType: "Run" as const,
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

const zoneChallenge = {
  id: "ch-zone",
  scoring: "zone" as const,
  zoneConfig: null,
  startDate: "2026-07-01",
  endDate: "2026-07-31",
};

describe("decideGoalActivity", () => {
  it("builds an activity when sport type matches and the date is in window", () => {
    const result = decideGoalActivity(runActivity, goalChallenge, "uid-1");
    expect(result?.source).toBe("strava");
    expect(result?.sportType).toBe("Run");
  });

  it("returns null when the challenge isn't a goal challenge", () => {
    expect(decideGoalActivity(runActivity, zoneChallenge as never, "uid-1")).toBeNull();
  });

  it("returns null when sport type doesn't match", () => {
    const rideChallenge = { ...goalChallenge, sportType: "Ride" as const };
    expect(decideGoalActivity(runActivity, rideChallenge, "uid-1")).toBeNull();
  });

  it("returns null when the activity date is outside the challenge window", () => {
    const augChallenge = { ...goalChallenge, startDate: "2026-08-01", endDate: "2026-08-31" };
    expect(decideGoalActivity(runActivity, augChallenge, "uid-1")).toBeNull();
  });
});

describe("decideZoneActivity", () => {
  const zones = { z2: 30, z3: 10, z4: 0, z5: 0 };

  it("builds a zone-training activity when zones are present and date is in window", () => {
    const result = decideZoneActivity(runActivity, zones, zoneChallenge, "uid-1");
    expect(result?.source).toBe("strava");
    expect(result?.zoneKind).toBe("zone-training");
    expect(result?.zones).toEqual(zones);
  });

  it("returns null when there's no HR zone data", () => {
    expect(decideZoneActivity(runActivity, null, zoneChallenge, "uid-1")).toBeNull();
  });

  it("returns null when the challenge isn't a zone challenge", () => {
    expect(decideZoneActivity(runActivity, zones, goalChallenge as never, "uid-1")).toBeNull();
  });

  it("returns null when the activity date is outside the challenge window", () => {
    const augChallenge = { ...zoneChallenge, startDate: "2026-08-01", endDate: "2026-08-31" };
    expect(decideZoneActivity(runActivity, zones, augChallenge, "uid-1")).toBeNull();
  });
});
