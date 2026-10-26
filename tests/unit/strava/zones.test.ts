import { describe, it, expect } from "vitest";
import { computeZoneMinutesFromStream } from "@/lib/strava/zones";

const MAX_HR = 192; // matches the real device example that motivated this model

describe("computeZoneMinutesFromStream", () => {
  it("buckets samples into zones by %-of-max-HR, dropping Z1 and below", () => {
    // 96-115 bpm = Z1 (50-60%), dropped. Boundaries from a real Garmin
    // zone chart: Z2 115-134 (60-70%), Z3 134-154 (70-80%),
    // Z4 154-173 (80-90%), Z5 173-192+ (90-100%).
    const result = computeZoneMinutesFromStream(
      {
        time: [0, 60, 120, 180, 240, 300],
        heartrate: [100, 120, 140, 160, 180, 180],
      },
      MAX_HR
    );
    // sample at t=0 (100bpm, Z1) -> dropped, gap to t=60 unused
    // sample at t=60 (120bpm, Z2) -> 60s = 1 min credited to z2
    // sample at t=120 (140bpm, Z3) -> 1 min to z3
    // sample at t=180 (160bpm, Z4) -> 1 min to z4
    // sample at t=240 (180bpm, Z5) -> 1 min to z5
    // sample at t=300 (180bpm, Z5) -> last sample, no next gap -> 0
    expect(result).toEqual({ z2: 1, z3: 1, z4: 1, z5: 1 });
  });

  it("treats the exact zone boundary as the start of the higher zone", () => {
    // Against a round max HR of 200, 140bpm is exactly 70% -> Z3, not Z2
    const result = computeZoneMinutesFromStream(
      { time: [0, 60], heartrate: [140, 140] },
      200
    );
    expect(result).toEqual({ z2: 0, z3: 1, z4: 0, z5: 0 });
  });

  it("credits 100%+ of max HR to Z5, not an error", () => {
    const result = computeZoneMinutesFromStream(
      { time: [0, 60], heartrate: [200, 200] }, // above max HR
      MAX_HR
    );
    expect(result).toEqual({ z2: 0, z3: 0, z4: 0, z5: 1 });
  });

  it("credits the full gap between samples, including a large one", () => {
    const result = computeZoneMinutesFromStream(
      { time: [0, 600], heartrate: [180, 180] }, // 10-minute gap, Z5 the whole time
      MAX_HR
    );
    expect(result!.z5).toBeCloseTo(10);
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
