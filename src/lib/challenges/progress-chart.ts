import type { Activity, ChallengeMember } from "@/types";

export interface ZoneProgressSeries {
  uid: string;
  displayName: string;
  /** cumulative points, aligned index-for-index with `dates` */
  points: number[];
}

export interface ZoneProgressChartData {
  /** YYYY-MM-DD, ascending, one entry per day any zone activity was logged */
  dates: string[];
  series: ZoneProgressSeries[];
}

/**
 * Cumulative zone points over time per member, for the progress chart.
 * The x-axis is the distinct set of days any zone activity was logged (not
 * every calendar day in the challenge window), matching what the legacy
 * Chart.js line chart drew. The 80/20 bonus isn't applied per day, only to
 * final totals (see effectiveZonePoints in zone.ts), so this tracks raw
 * point accumulation.
 */
export function buildZoneProgressChart(
  activities: Pick<Activity, "uid" | "startDate" | "points">[],
  members: Pick<ChallengeMember, "uid" | "displayName">[]
): ZoneProgressChartData {
  const pointsByDateAndUid = new Map<string, Map<string, number>>();

  for (const activity of activities) {
    const day = activity.startDate.slice(0, 10);
    if (!pointsByDateAndUid.has(day)) pointsByDateAndUid.set(day, new Map());
    const byUid = pointsByDateAndUid.get(day)!;
    byUid.set(activity.uid, (byUid.get(activity.uid) ?? 0) + (activity.points ?? 0));
  }

  const dates = [...pointsByDateAndUid.keys()].sort();

  const series = members.map((member) => {
    let running = 0;
    const points = dates.map((day) => {
      running += pointsByDateAndUid.get(day)?.get(member.uid) ?? 0;
      return running;
    });
    return { uid: member.uid, displayName: member.displayName, points };
  });

  return { dates, series };
}

/**
 * Y-axis ticks at round values (0, 200, 400, …) covering `dataMax`, with
 * about `targetTicks` intervals. Steps are 1, 2, 2.5 or 5 × a power of ten,
 * never below 1 (points are whole numbers). Dividing the raw max evenly gave
 * labels like 153 / 305 / 458.
 */
export function niceYTicks(dataMax: number, targetTicks: number): number[] {
  const raw = Math.max(dataMax, 1) / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const normalized = raw / magnitude;
  const factor =
    normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10;
  const step = Math.max(1, factor * magnitude);
  const count = Math.max(1, Math.ceil(Math.max(dataMax, 1) / step));
  return Array.from({ length: count + 1 }, (_, i) => i * step);
}
