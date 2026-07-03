import type { ChallengeMember, ZoneConfig } from "@/types";

/**
 * Default zone-challenge rules — the SummerFit 2026 model
 * (docs/legacy-summerfit-handoff.md §3). Copied onto each new zone
 * challenge at creation, so tweaking these defaults never rewrites the
 * rules of a running or finished challenge.
 */
export const DEFAULT_ZONE_CONFIG: ZoneConfig = {
  multipliers: { z2: 1.0, z3: 0.5, z4: 1.5, z5: 2.0 },
  othersPoints: { thirtyMin: 20, sixtyMin: 40 },
  recoveryPoints: 30,
  bonus: { low: 0.7, high: 0.85, multiplier: 1.15 },
};

export type ZoneMinutes = { z2: number; z3: number; z4: number; z5: number };

export type OthersTier = "30" | "60";

export type ZoneActivityInput =
  | { kind: "zone-training"; zones: ZoneMinutes }
  | { kind: "others"; tier: OthersTier }
  | { kind: "recovery" };

/** Points a single activity earns (pre-bonus). */
export function zoneActivityPoints(
  input: ZoneActivityInput,
  config: ZoneConfig
): number {
  switch (input.kind) {
    case "zone-training": {
      const { z2, z3, z4, z5 } = input.zones;
      const m = config.multipliers;
      return round1(z2 * m.z2 + z3 * m.z3 + z4 * m.z4 + z5 * m.z5);
    }
    case "others":
      return input.tier === "60"
        ? config.othersPoints.sixtyMin
        : config.othersPoints.thirtyMin;
    case "recovery":
      return config.recoveryPoints;
  }
}

/** Duration in minutes an entry represents (feeds totalDuration). */
export function zoneActivityMinutes(input: ZoneActivityInput): number {
  switch (input.kind) {
    case "zone-training": {
      const { z2, z3, z4, z5 } = input.zones;
      return z2 + z3 + z4 + z5;
    }
    case "others":
      return Number(input.tier);
    case "recovery":
      return 0; // duration isn't tracked for recovery
  }
}

/**
 * The 80/20 bonus (the signature mechanic): low intensity = Z2 minutes
 * plus 30 min credited per recovery activity; high intensity = Z4 + Z5.
 * Z3 and Others are excluded from the ratio. Bonus applies when the low
 * share of (low + high) is within [low, high] of the config.
 */
export function lowIntensityRatio(
  member: Pick<ChallengeMember, "zoneMinutes" | "recoveryCount">
): number | null {
  const zones = member.zoneMinutes ?? { z2: 0, z3: 0, z4: 0, z5: 0 };
  const low = zones.z2 + 30 * (member.recoveryCount ?? 0);
  const high = zones.z4 + zones.z5;
  if (low + high === 0) return null;
  return low / (low + high);
}

export function hasZoneBonus(
  member: Pick<ChallengeMember, "zoneMinutes" | "recoveryCount">,
  config: ZoneConfig
): boolean {
  const ratio = lowIntensityRatio(member);
  return ratio !== null && ratio >= config.bonus.low && ratio <= config.bonus.high;
}

/** Total points with the 80/20 bonus applied — what the leaderboard ranks by. */
export function effectiveZonePoints(
  member: Pick<ChallengeMember, "totalPoints" | "zoneMinutes" | "recoveryCount">,
  config: ZoneConfig
): number {
  const base = member.totalPoints ?? 0;
  return round1(hasZoneBonus(member, config) ? base * config.bonus.multiplier : base);
}

/**
 * Weekly recovery limit: max one recovery activity per calendar week
 * (Mon–Sun), checked against the member's already-loaded activities.
 */
export function recoveryUsedInWeek(
  activities: { uid: string; zoneKind?: string | null; startDate: string }[],
  uid: string,
  date: string // YYYY-MM-DD of the entry being added
): boolean {
  const [weekStart, weekEnd] = calendarWeekOf(date);
  return activities.some((a) => {
    if (a.uid !== uid || a.zoneKind !== "recovery") return false;
    const day = a.startDate.slice(0, 10);
    return day >= weekStart && day <= weekEnd;
  });
}

/** [Monday, Sunday] of the calendar week containing the given date. */
export function calendarWeekOf(date: string): [string, string] {
  const d = new Date(`${date}T12:00:00Z`);
  const weekday = d.getUTCDay(); // 0 = Sunday
  const sinceMonday = (weekday + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - sinceMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return [toDateString(monday), toDateString(sunday)];
}

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
