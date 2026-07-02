import { describe, it, expect } from "vitest";
import {
  createChallengeSchema,
  isDateInChallengeWindow,
  manualActivitySchema,
  varietyActivitySchema,
  zoneActivitySchema,
} from "@/lib/challenges/validation";

describe("createChallengeSchema", () => {
  const valid = {
    name: "July running",
    description: "",
    scoring: "goal",
    sportType: "Run",
    goal: { value: 100, unit: "distance_km" },
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  };

  it("accepts a valid challenge", () => {
    expect(createChallengeSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts a single-day challenge (start == end)", () => {
    const result = createChallengeSchema.safeParse({
      ...valid,
      endDate: valid.startDate,
    });
    expect(result.success).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const result = createChallengeSchema.safeParse({
      ...valid,
      endDate: "2026-06-30",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a zero or negative goal", () => {
    for (const value of [0, -5]) {
      expect(
        createChallengeSchema.safeParse({ ...valid, goal: { value, unit: "count" } })
          .success
      ).toBe(false);
    }
  });

  it("rejects an unknown sport", () => {
    expect(
      createChallengeSchema.safeParse({ ...valid, sportType: "Chess" }).success
    ).toBe(false);
  });

  it("rejects a too-short name", () => {
    expect(createChallengeSchema.safeParse({ ...valid, name: "ab" }).success).toBe(
      false
    );
  });

  it("accepts zone and variety challenges without sport or goal", () => {
    for (const scoring of ["zone", "variety"]) {
      const result = createChallengeSchema.safeParse({
        ...valid,
        scoring,
        sportType: null,
        goal: null,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a goal challenge without a goal", () => {
    expect(
      createChallengeSchema.safeParse({ ...valid, goal: null }).success
    ).toBe(false);
  });
});

describe("zoneActivitySchema", () => {
  it("accepts zone training with time in at least one zone", () => {
    const result = zoneActivitySchema.safeParse({
      kind: "zone-training",
      date: "2026-07-02",
      zones: { z2: 30, z3: 0, z4: 0, z5: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects zone training with all zones at zero", () => {
    const result = zoneActivitySchema.safeParse({
      kind: "zone-training",
      date: "2026-07-02",
      zones: { z2: 0, z3: 0, z4: 0, z5: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("accepts others with a valid tier and rejects unknown tiers", () => {
    expect(
      zoneActivitySchema.safeParse({ kind: "others", date: "2026-07-02", tier: "60" })
        .success
    ).toBe(true);
    expect(
      zoneActivitySchema.safeParse({ kind: "others", date: "2026-07-02", tier: "90" })
        .success
    ).toBe(false);
  });

  it("accepts a bare recovery entry", () => {
    expect(
      zoneActivitySchema.safeParse({ kind: "recovery", date: "2026-07-02" }).success
    ).toBe(true);
  });

  it("rejects negative zone minutes", () => {
    const result = zoneActivitySchema.safeParse({
      kind: "zone-training",
      date: "2026-07-02",
      zones: { z2: -5, z3: 0, z4: 10, z5: 0 },
    });
    expect(result.success).toBe(false);
  });
});

describe("varietyActivitySchema", () => {
  it("accepts a kind and date", () => {
    expect(
      varietyActivitySchema.safeParse({ kindId: "climbing", date: "2026-07-02" })
        .success
    ).toBe(true);
  });

  it("rejects an empty kind", () => {
    expect(
      varietyActivitySchema.safeParse({ kindId: "", date: "2026-07-02" }).success
    ).toBe(false);
  });
});

describe("manualActivitySchema", () => {
  const valid = {
    name: "Morning run",
    date: "2026-07-02",
    distanceKm: 5.2,
    durationMinutes: 31,
  };

  it("accepts a valid activity", () => {
    expect(manualActivitySchema.safeParse(valid).success).toBe(true);
  });

  it("accepts zero distance (non-distance sports)", () => {
    expect(
      manualActivitySchema.safeParse({ ...valid, distanceKm: 0 }).success
    ).toBe(true);
  });

  it("rejects zero duration", () => {
    expect(
      manualActivitySchema.safeParse({ ...valid, durationMinutes: 0 }).success
    ).toBe(false);
  });

  it("rejects negative distance", () => {
    expect(
      manualActivitySchema.safeParse({ ...valid, distanceKm: -1 }).success
    ).toBe(false);
  });

  it("rejects a malformed date", () => {
    expect(
      manualActivitySchema.safeParse({ ...valid, date: "02.07.2026" }).success
    ).toBe(false);
  });
});

describe("isDateInChallengeWindow", () => {
  const challenge = { startDate: "2026-07-01", endDate: "2026-07-31" };

  it("accepts dates inside the window, inclusive of both ends", () => {
    expect(isDateInChallengeWindow("2026-07-01", challenge)).toBe(true);
    expect(isDateInChallengeWindow("2026-07-15", challenge)).toBe(true);
    expect(isDateInChallengeWindow("2026-07-31", challenge)).toBe(true);
  });

  it("rejects dates outside the window", () => {
    expect(isDateInChallengeWindow("2026-06-30", challenge)).toBe(false);
    expect(isDateInChallengeWindow("2026-08-01", challenge)).toBe(false);
  });
});
