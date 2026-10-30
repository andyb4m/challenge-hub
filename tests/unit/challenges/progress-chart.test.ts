import { describe, it, expect } from "vitest";
import { buildZoneProgressChart, niceYTicks } from "@/lib/challenges/progress-chart";

const members = [
  { uid: "u1", displayName: "Andy" },
  { uid: "u2", displayName: "Caro" },
];

describe("buildZoneProgressChart", () => {
  it("returns empty series when there are no activities", () => {
    const result = buildZoneProgressChart([], members);
    expect(result.dates).toEqual([]);
    expect(result.series).toEqual([
      { uid: "u1", displayName: "Andy", points: [] },
      { uid: "u2", displayName: "Caro", points: [] },
    ]);
  });

  it("sums same-day entries for a member and carries totals forward across days", () => {
    const activities = [
      { uid: "u1", startDate: "2026-07-01T08:00:00Z", points: 10 },
      { uid: "u1", startDate: "2026-07-01T18:00:00Z", points: 5 },
      { uid: "u1", startDate: "2026-07-03T08:00:00Z", points: 20 },
      { uid: "u2", startDate: "2026-07-02T08:00:00Z", points: 8 },
    ];

    const result = buildZoneProgressChart(activities, members);

    expect(result.dates).toEqual(["2026-07-01", "2026-07-02", "2026-07-03"]);
    expect(result.series).toEqual([
      { uid: "u1", displayName: "Andy", points: [15, 15, 35] },
      { uid: "u2", displayName: "Caro", points: [0, 8, 8] },
    ]);
  });

  it("sorts unordered input dates ascending", () => {
    const activities = [
      { uid: "u1", startDate: "2026-07-05T08:00:00Z", points: 3 },
      { uid: "u1", startDate: "2026-07-02T08:00:00Z", points: 4 },
    ];

    const result = buildZoneProgressChart(activities, members);

    expect(result.dates).toEqual(["2026-07-02", "2026-07-05"]);
    expect(result.series[0].points).toEqual([4, 7]);
  });

  it("treats missing points as zero", () => {
    const activities = [{ uid: "u1", startDate: "2026-07-01T08:00:00Z", points: null }];

    const result = buildZoneProgressChart(activities, members);

    expect(result.series[0].points).toEqual([0]);
  });
});

describe("niceYTicks", () => {
  it("rounds an awkward max up to round steps", () => {
    expect(niceYTicks(610, 4)).toEqual([0, 200, 400, 600, 800]);
  });

  it("uses 2.5x steps where they fit tighter", () => {
    expect(niceYTicks(100, 4)).toEqual([0, 25, 50, 75, 100]);
  });

  it("covers the max exactly when it is already round", () => {
    expect(niceYTicks(400, 4)).toEqual([0, 100, 200, 300, 400]);
  });

  it("never uses fractional steps for small or empty data", () => {
    expect(niceYTicks(3, 4)).toEqual([0, 1, 2, 3]);
    expect(niceYTicks(0, 4)).toEqual([0, 1]);
  });
});
