import { describe, it, expect } from "vitest";
import { computeZoneMinutesFromStream } from "@/lib/strava/zones";

const MAX_HR = 192; // matches the real device example that motivated this model

describe("computeZoneMinutesFromStream", () => {
  it("buckets samples into zones by %-of-max-HR, dropping Z1 and below", () => {
    // 96-115 bpm = Z1 (50-60%), dropped. Boundaries from a real Garmin
    // zone chart: Z2 115-134 (60-70%), Z3 134-154 (70-80%),
    // Z4 154-173 (80-90%), Z5 173-192+ (90-100%). 30s gaps throughout —
    // right at the cap, so nothing here is capped.
    const result = computeZoneMinutesFromStream(
      {
        time: [0, 30, 60, 90, 120, 150],
        heartrate: [100, 120, 140, 160, 180, 180],
      },
      MAX_HR
    );
    // sample at t=0 (100bpm, Z1) -> dropped, gap to t=30 unused
    // sample at t=30 (120bpm, Z2) -> 30s = 0.5 min credited to z2
    // sample at t=60 (140bpm, Z3) -> 0.5 min to z3
    // sample at t=90 (160bpm, Z4) -> 0.5 min to z4
    // sample at t=120 (180bpm, Z5) -> 0.5 min to z5
    // sample at t=150 (180bpm, Z5) -> last sample, no next gap -> 0
    expect(result).toEqual({ z2: 0.5, z3: 0.5, z4: 0.5, z5: 0.5 });
  });

  it("treats the exact zone boundary as the start of the higher zone", () => {
    // Against a round max HR of 200, 140bpm is exactly 70% -> Z3, not Z2
    const result = computeZoneMinutesFromStream(
      { time: [0, 30], heartrate: [140, 140] },
      200
    );
    expect(result).toEqual({ z2: 0, z3: 0.5, z4: 0, z5: 0 });
  });

  it("credits 100%+ of max HR to Z5, not an error", () => {
    const result = computeZoneMinutesFromStream(
      { time: [0, 30], heartrate: [200, 200] }, // above max HR
      MAX_HR
    );
    expect(result).toEqual({ z2: 0, z3: 0, z4: 0, z5: 0.5 });
  });

  it("caps a single sample's credited duration, so a pause doesn't inflate whatever zone preceded it", () => {
    // A 10-minute gap (e.g. a café stop mid-run) with the last reading
    // before it in Z5 — without a cap this would credit 10 Z5 minutes
    // for time that was actually spent standing still.
    const result = computeZoneMinutesFromStream(
      { time: [0, 600], heartrate: [180, 180] },
      MAX_HR
    );
    expect(result!.z5).toBeCloseTo(30 / 60);
  });

  it("returns null for an empty stream", () => {
    expect(computeZoneMinutesFromStream({ time: [], heartrate: [] }, MAX_HR)).toBeNull();
  });

  it("returns null when time and heartrate arrays don't line up", () => {
    expect(
      computeZoneMinutesFromStream({ time: [0, 60], heartrate: [120] }, MAX_HR)
    ).toBeNull();
  });

  it("returns null for a non-positive max heart rate", () => {
    expect(
      computeZoneMinutesFromStream({ time: [0, 60], heartrate: [150] }, 0)
    ).toBeNull();
  });
});
