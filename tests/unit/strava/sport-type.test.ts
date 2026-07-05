import { describe, it, expect } from "vitest";
import { mapStravaSportType } from "@/lib/strava/sport-type";

describe("mapStravaSportType", () => {
  it("maps known Strava sport types to our SportType enum", () => {
    expect(mapStravaSportType("Run")).toBe("Run");
    expect(mapStravaSportType("TrailRun")).toBe("Run");
    expect(mapStravaSportType("Ride")).toBe("Ride");
    expect(mapStravaSportType("MountainBikeRide")).toBe("Ride");
    expect(mapStravaSportType("Swim")).toBe("Swim");
    expect(mapStravaSportType("Walk")).toBe("Walk");
    expect(mapStravaSportType("Hike")).toBe("Hike");
    expect(mapStravaSportType("WeightTraining")).toBe("WeightTraining");
    expect(mapStravaSportType("Workout")).toBe("WeightTraining");
    expect(mapStravaSportType("Yoga")).toBe("Yoga");
  });

  it("falls back to Other for unmapped or unknown sport types", () => {
    expect(mapStravaSportType("AlpineSki")).toBe("Other");
    expect(mapStravaSportType("Rowing")).toBe("Other");
    expect(mapStravaSportType("SomethingBrandNew")).toBe("Other");
  });
});
