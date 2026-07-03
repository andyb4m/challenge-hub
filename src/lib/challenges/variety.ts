import type { Challenge, ChallengeMember, VarietyKindConfig } from "@/types";

/**
 * Default catalog for new variety challenges ("as many different kinds of
 * activities as possible"). Translated from Andreas's list. The creator
 * can add/remove kinds and set how often each counts, per challenge —
 * this list only seeds the create form.
 */
export const VARIETY_KINDS: { id: string; label: string }[] = [
  { id: "gym", label: "🏋️ Gym / strength training" },
  { id: "home-workout", label: "💪 Home workout / bodyweight" },
  { id: "running", label: "🏃 Running / jogging" },
  { id: "cycling", label: "🚴 Cycling (road / gravel / city)" },
  { id: "yoga", label: "🧘 Yoga" },
  { id: "pilates", label: "🤸 Pilates" },
  { id: "hiking", label: "🥾 Hiking / trail running" },
  { id: "climbing", label: "🧗 Climbing" },
  { id: "bouldering", label: "🪨 Bouldering" },
  { id: "slacklining", label: "🤹 Slacklining" },
  { id: "swimming", label: "🏊 Swimming" },
  { id: "sup", label: "🛶 Stand-up paddling (SUP)" },
  { id: "paddling", label: "🚣 Kayak / canoe / rowing" },
  { id: "surfing", label: "🏄 Surfing / windsurfing / kitesurfing" },
  { id: "wakeboarding", label: "🌊 Waterski / wakeboarding" },
  { id: "fishing", label: "🎣 Fly fishing / fishing" },
  { id: "beach-volleyball", label: "🏐 Beach volleyball" },
  { id: "squash", label: "🎯 Squash" },
  { id: "tennis", label: "🎾 Tennis" },
  { id: "table-tennis", label: "🏓 Table tennis" },
  { id: "football", label: "⚽ Football" },
  { id: "basketball", label: "🏀 Basketball / streetball" },
  { id: "spikeball", label: "🟡 Spikeball / roundnet" },
  { id: "frisbee", label: "🥏 Frisbee / Ultimate" },
  { id: "badminton", label: "🏸 Badminton" },
  { id: "padel", label: "🎾 Padel" },
  { id: "golf", label: "⛳ Golf / minigolf" },
  { id: "skating", label: "🛼 Inline / roller skating" },
  { id: "skateboarding", label: "🛹 Skateboarding / longboarding" },
];

/** Seed config for the create form: full catalog, everything counts once. */
export function defaultVarietyKinds(): VarietyKindConfig[] {
  return VARIETY_KINDS.map((k) => ({ ...k, maxCount: 1 }));
}

/**
 * The challenge's kind list. Falls back to the default catalog for docs
 * created before configs existed.
 */
export function varietyKinds(
  challenge: Pick<Challenge, "varietyConfig">
): VarietyKindConfig[] {
  return challenge.varietyConfig?.kinds ?? defaultVarietyKinds();
}

export function varietyKindById(
  challenge: Pick<Challenge, "varietyConfig">,
  kindId: string
): VarietyKindConfig | undefined {
  return varietyKinds(challenge).find((k) => k.id === kindId);
}

export function kindCountFor(
  member: Pick<ChallengeMember, "kindCounts">,
  kindId: string
): number {
  return member.kindCounts?.[kindId] ?? 0;
}

/**
 * Variety score: per kind, logged activities count up to the kind's
 * maxCount. Kinds removed from the config score zero, and lowering a
 * maxCount clamps retroactively — creator edits stay coherent mid-game.
 */
export function varietyScore(
  member: Pick<ChallengeMember, "kindCounts">,
  kinds: VarietyKindConfig[]
): number {
  return kinds.reduce(
    (sum, kind) => sum + Math.min(kindCountFor(member, kind.id), kind.maxCount),
    0
  );
}

/** Highest score the config allows — the progress-bar denominator. */
export function varietyMaxScore(kinds: VarietyKindConfig[]): number {
  return kinds.reduce((sum, kind) => sum + kind.maxCount, 0);
}

/**
 * Stable id for a creator-added kind. Slugified label; suffixed when it
 * collides with an existing id.
 */
export function makeKindId(label: string, existingIds: string[]): string {
  const base =
    label
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // strip accents
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "kind";
  if (!existingIds.includes(base)) return base;
  let n = 2;
  while (existingIds.includes(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}
