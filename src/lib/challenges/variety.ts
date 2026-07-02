import type { Activity, ChallengeMember } from "@/types";

export interface VarietyKind {
  id: string;
  label: string;
  emoji: string;
}

/**
 * Catalog for variety challenges ("as many different kinds of activities
 * as possible — each kind counts once"). Translated from Andreas's list;
 * extend here when the group invents new sports.
 */
export const VARIETY_KINDS: VarietyKind[] = [
  { id: "gym", label: "Gym / strength training", emoji: "🏋️" },
  { id: "home-workout", label: "Home workout / bodyweight", emoji: "💪" },
  { id: "running", label: "Running / jogging", emoji: "🏃" },
  { id: "cycling", label: "Cycling (road / gravel / city)", emoji: "🚴" },
  { id: "yoga", label: "Yoga", emoji: "🧘" },
  { id: "pilates", label: "Pilates", emoji: "🤸" },
  { id: "hiking", label: "Hiking / trail running", emoji: "🥾" },
  { id: "climbing", label: "Climbing", emoji: "🧗" },
  { id: "bouldering", label: "Bouldering", emoji: "🪨" },
  { id: "slacklining", label: "Slacklining", emoji: "🤹" },
  { id: "swimming", label: "Swimming", emoji: "🏊" },
  { id: "sup", label: "Stand-up paddling (SUP)", emoji: "🛶" },
  { id: "paddling", label: "Kayak / canoe / rowing", emoji: "🚣" },
  { id: "surfing", label: "Surfing / windsurfing / kitesurfing", emoji: "🏄" },
  { id: "wakeboarding", label: "Waterski / wakeboarding", emoji: "🌊" },
  { id: "fishing", label: "Fly fishing / fishing", emoji: "🎣" },
  { id: "beach-volleyball", label: "Beach volleyball", emoji: "🏐" },
  { id: "squash", label: "Squash", emoji: "🎯" },
  { id: "tennis", label: "Tennis", emoji: "🎾" },
  { id: "table-tennis", label: "Table tennis", emoji: "🏓" },
  { id: "football", label: "Football", emoji: "⚽" },
  { id: "basketball", label: "Basketball / streetball", emoji: "🏀" },
  { id: "spikeball", label: "Spikeball / roundnet", emoji: "🟡" },
  { id: "frisbee", label: "Frisbee / Ultimate", emoji: "🥏" },
  { id: "badminton", label: "Badminton", emoji: "🏸" },
  { id: "padel", label: "Padel", emoji: "🎾" },
  { id: "golf", label: "Golf / minigolf", emoji: "⛳" },
  { id: "skating", label: "Inline / roller skating", emoji: "🛼" },
  { id: "skateboarding", label: "Skateboarding / longboarding", emoji: "🛹" },
];

export const VARIETY_KIND_IDS = VARIETY_KINDS.map((k) => k.id);

const kindById = new Map(VARIETY_KINDS.map((k) => [k.id, k]));

export function varietyKindLabel(id: string): string {
  const kind = kindById.get(id);
  return kind ? `${kind.emoji} ${kind.label}` : id;
}

/** Distinct kinds a member has logged — the variety leaderboard score. */
export function varietyScore(member: Pick<ChallengeMember, "kinds">): number {
  return (member.kinds ?? []).length;
}

/**
 * Whether this kind already counts for the member. Logging it again is
 * allowed (diary value) but adds no score — the UI says so.
 */
export function kindAlreadyCounted(
  member: Pick<ChallengeMember, "kinds">,
  kindId: string
): boolean {
  return (member.kinds ?? []).includes(kindId);
}

/**
 * True when this activity is the member's only remaining activity of its
 * kind, i.e. deleting it must also un-count the kind. Decided from the
 * already-loaded activity list to keep the delete batch simple.
 */
export function isLastOfKind(
  activity: Pick<Activity, "id" | "uid" | "varietyKind">,
  allActivities: Pick<Activity, "id" | "uid" | "varietyKind">[]
): boolean {
  if (!activity.varietyKind) return false;
  return !allActivities.some(
    (a) =>
      a.id !== activity.id &&
      a.uid === activity.uid &&
      a.varietyKind === activity.varietyKind
  );
}
