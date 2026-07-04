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
