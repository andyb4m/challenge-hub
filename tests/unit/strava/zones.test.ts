import { describe, it, expect } from "vitest";
import { mapStravaHeartrateZones } from "@/lib/strava/zones";

function bucket(time: number) {
  return { min: 0, max: 0, time };
}

describe("mapStravaHeartrateZones", () => {
  it("maps buckets 1-4 to z2-z5, dropping bucket 0 (Strava Zone 1)", () => {
    const result = mapStravaHeartrateZones([
      {
        type: "heartrate",
        distribution_buckets: [
          bucket(600), // Zone 1 - dropped
          bucket(300), // Zone 2 -> z2
          bucket(900), // Zone 3 -> z3
          bucket(120), // Zone 4 -> z4
          bucket(60), // Zone 5 -> z5
        ],
      },
    ]);

    expect(result).toEqual({ z2: 5, z3: 15, z4: 2, z5: 1 });
  });

  it("ignores a power distribution and uses only heartrate", () => {
    const result = mapStravaHeartrateZones([
      { type: "power", distribution_buckets: Array(5).fill(bucket(9999)) },
      {
        type: "heartrate",
        distribution_buckets: [
          bucket(0),
          bucket(60),
          bucket(0),
          bucket(0),
          bucket(0),
        ],
      },
    ]);

    expect(result).toEqual({ z2: 1, z3: 0, z4: 0, z5: 0 });
  });

  it("returns null when there's no heartrate distribution", () => {
    expect(mapStravaHeartrateZones([])).toBeNull();
    expect(
      mapStravaHeartrateZones([
        { type: "power", distribution_buckets: Array(5).fill(bucket(100)) },
      ])
    ).toBeNull();
  });

  it("returns null when the heartrate distribution has fewer than 5 buckets", () => {
    const result = mapStravaHeartrateZones([
      { type: "heartrate", distribution_buckets: [bucket(60), bucket(60)] },
    ]);
    expect(result).toBeNull();
  });
});
