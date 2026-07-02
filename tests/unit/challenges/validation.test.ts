import { describe, it, expect } from "vitest";
import {
  createChallengeSchema,
  isDateInChallengeWindow,
  manualActivitySchema,
} from "@/lib/challenges/validation";

describe("createChallengeSchema", () => {
  const valid = {
    name: "July running",
    description: "",
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
