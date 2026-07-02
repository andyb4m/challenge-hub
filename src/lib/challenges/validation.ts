import { z } from "zod";

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a date as YYYY-MM-DD");

export const SPORT_TYPES = [
  "Run",
  "Ride",
  "Swim",
  "Walk",
  "Hike",
  "WeightTraining",
  "Yoga",
  "Other",
] as const;

export const GOAL_UNITS = [
  "distance_km",
  "distance_miles",
  "duration_minutes",
  "count",
] as const;

export const GOAL_UNIT_LABELS: Record<(typeof GOAL_UNITS)[number], string> = {
  distance_km: "Distance (km)",
  distance_miles: "Distance (miles)",
  duration_minutes: "Duration (minutes)",
  count: "Number of activities",
};

export const CHALLENGE_SCORINGS = ["goal", "zone", "variety"] as const;

export const createChallengeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, "Name must be at least 3 characters")
      .max(60, "Name must be at most 60 characters"),
    description: z
      .string()
      .trim()
      .max(500, "Description must be at most 500 characters"),
    scoring: z.enum(CHALLENGE_SCORINGS),
    // Only goal challenges carry a sport and target; zone/variety pass null
    sportType: z.enum(SPORT_TYPES).nullable(),
    goal: z
      .object({
        value: z
          .number({ invalid_type_error: "Enter a goal value" })
          .positive("Goal must be greater than zero")
          .max(1_000_000, "That goal looks too large"),
        unit: z.enum(GOAL_UNITS),
      })
      .nullable(),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "End date must not be before the start date",
    path: ["endDate"],
  })
  .refine((c) => c.scoring !== "goal" || (c.sportType !== null && c.goal !== null), {
    message: "Goal challenges need a sport and a goal",
    path: ["goal"],
  });

export const manualActivitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the activity a name")
    .max(80, "Name must be at most 80 characters"),
  date: dateString,
  distanceKm: z
    .number({ invalid_type_error: "Enter a distance (use 0 if none)" })
    .min(0, "Distance can't be negative")
    .max(2000, "That distance looks too large"),
  durationMinutes: z
    .number({ invalid_type_error: "Enter a duration in minutes" })
    .positive("Duration must be greater than zero")
    .max(24 * 60, "Duration can't exceed 24 hours"),
});

const zoneMinutesField = z
  .number({ invalid_type_error: "Enter minutes (0 if none)" })
  .min(0, "Minutes can't be negative")
  .max(600, "That looks too long for one session");

/** Zone challenge entry: exactly one of the three shapes. */
export const zoneActivitySchema = z
  .discriminatedUnion("kind", [
    z.object({
      kind: z.literal("zone-training"),
      date: dateString,
      zones: z.object({
        z2: zoneMinutesField,
        z3: zoneMinutesField,
        z4: zoneMinutesField,
        z5: zoneMinutesField,
      }),
    }),
    z.object({
      kind: z.literal("others"),
      date: dateString,
      tier: z.enum(["30", "60"]),
    }),
    z.object({
      kind: z.literal("recovery"),
      date: dateString,
    }),
  ])
  // zod can't nest .refine() inside a discriminatedUnion member, so the
  // "at least one zone" rule lives on the union
  .superRefine((a, ctx) => {
    if (
      a.kind === "zone-training" &&
      a.zones.z2 + a.zones.z3 + a.zones.z4 + a.zones.z5 <= 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Enter time in at least one zone",
        path: ["zones"],
      });
    }
  });

export const varietyActivitySchema = z.object({
  kindId: z.string().min(1, "Pick an activity"),
  date: dateString,
});

/**
 * The activity date must fall inside the challenge window — mirrors the
 * filter the Strava sync will apply.
 */
export function isDateInChallengeWindow(
  date: string,
  challenge: { startDate: string; endDate: string }
): boolean {
  return date >= challenge.startDate && date <= challenge.endDate;
}

export type CreateChallengeFormInput = z.infer<typeof createChallengeSchema>;
export type ManualActivityFormInput = z.infer<typeof manualActivitySchema>;
