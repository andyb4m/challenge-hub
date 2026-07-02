import { describe, it, expect } from "vitest";
import {
  calendarWeekOf,
  DEFAULT_ZONE_CONFIG,
  effectiveZonePoints,
  hasZoneBonus,
  lowIntensityRatio,
  recoveryUsedInWeek,
  zoneActivityPoints,
} from "@/lib/challenges/zone";

const config = DEFAULT_ZONE_CONFIG;

describe("zoneActivityPoints", () => {
  it("multiplies minutes per zone (SummerFit multipliers)", () => {
    expect(
      zoneActivityPoints(
        { kind: "zone-training", zones: { z2: 60, z3: 20, z4: 10, z5: 5 } },
        config
      )
    ).toBe(60 * 1.0 + 20 * 0.5 + 10 * 1.5 + 5 * 2.0); // 95
  });

  it("rounds to one decimal", () => {
    expect(
      zoneActivityPoints(
        { kind: "zone-training", zones: { z2: 0, z3: 1.25, z4: 0, z5: 0 } },
        config
      )
    ).toBe(0.6);
  });

  it("scores others by duration tier", () => {
    expect(zoneActivityPoints({ kind: "others", tier: "30" }, config)).toBe(20);
    expect(zoneActivityPoints({ kind: "others", tier: "60" }, config)).toBe(40);
  });

  it("scores recovery flat", () => {
    expect(zoneActivityPoints({ kind: "recovery" }, config)).toBe(30);
  });
});

describe("80/20 bonus", () => {
  it("computes the low-intensity ratio from Z2 + recovery credit vs Z4+Z5", () => {
    // low = 70 + 30×1 = 100, high = 20 + 5 = 25 → 100/125 = 0.8
    const member = {
      zoneMinutes: { z2: 70, z3: 999, z4: 20, z5: 5 }, // z3 must not matter
      recoveryCount: 1,
    };
    expect(lowIntensityRatio(member)).toBeCloseTo(0.8);
    expect(hasZoneBonus(member, config)).toBe(true);
  });

  it("grants no bonus outside the 70–85% band", () => {
    const tooHard = { zoneMinutes: { z2: 10, z3: 0, z4: 45, z5: 45 }, recoveryCount: 0 };
    expect(hasZoneBonus(tooHard, config)).toBe(false); // ratio 0.1

    const tooEasy = { zoneMinutes: { z2: 95, z3: 0, z4: 5, z5: 0 }, recoveryCount: 0 };
    expect(hasZoneBonus(tooEasy, config)).toBe(false); // ratio 0.95
  });

  it("grants no bonus with no zone training at all", () => {
    expect(lowIntensityRatio({ zoneMinutes: undefined, recoveryCount: 0 })).toBeNull();
    expect(hasZoneBonus({ zoneMinutes: undefined, recoveryCount: 0 }, config)).toBe(false);
  });

  it("includes the band edges (70% and 85%)", () => {
    const atLow = { zoneMinutes: { z2: 70, z3: 0, z4: 30, z5: 0 }, recoveryCount: 0 };
    expect(hasZoneBonus(atLow, config)).toBe(true);
    const atHigh = { zoneMinutes: { z2: 85, z3: 0, z4: 15, z5: 0 }, recoveryCount: 0 };
    expect(hasZoneBonus(atHigh, config)).toBe(true);
  });

  it("multiplies effective points by 1.15 when active", () => {
    const member = {
      totalPoints: 200,
      zoneMinutes: { z2: 80, z3: 0, z4: 20, z5: 0 },
      recoveryCount: 0,
    };
    expect(effectiveZonePoints(member, config)).toBe(230);
  });

  it("leaves points untouched when inactive", () => {
    const member = {
      totalPoints: 200,
      zoneMinutes: { z2: 0, z3: 0, z4: 100, z5: 0 },
      recoveryCount: 0,
    };
    expect(effectiveZonePoints(member, config)).toBe(200);
  });
});

describe("calendarWeekOf", () => {
  it("returns Monday–Sunday of the containing week", () => {
    // 2026-07-02 is a Thursday
    expect(calendarWeekOf("2026-07-02")).toEqual(["2026-06-29", "2026-07-05"]);
  });

  it("handles Monday and Sunday themselves", () => {
    expect(calendarWeekOf("2026-06-29")).toEqual(["2026-06-29", "2026-07-05"]);
    expect(calendarWeekOf("2026-07-05")).toEqual(["2026-06-29", "2026-07-05"]);
  });
});

describe("recoveryUsedInWeek", () => {
  const activities = [
    { uid: "a", zoneKind: "recovery", startDate: "2026-06-30T12:00:00.000Z" },
    { uid: "b", zoneKind: "recovery", startDate: "2026-07-02T12:00:00.000Z" },
    { uid: "a", zoneKind: "zone-training", startDate: "2026-07-02T12:00:00.000Z" },
  ];

  it("blocks a second recovery in the same calendar week", () => {
    expect(recoveryUsedInWeek(activities, "a", "2026-07-03")).toBe(true);
  });

  it("allows recovery in a different week", () => {
    expect(recoveryUsedInWeek(activities, "a", "2026-07-06")).toBe(false);
  });

  it("only counts the member's own recoveries", () => {
    expect(recoveryUsedInWeek(activities, "c", "2026-07-02")).toBe(false);
  });

  it("ignores non-recovery activities", () => {
    const onlyTraining = [activities[2]];
    expect(recoveryUsedInWeek(onlyTraining, "a", "2026-07-02")).toBe(false);
  });
});
