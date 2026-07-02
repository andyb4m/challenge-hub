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
    sportType: z.enum(SPORT_TYPES),
    goal: z.object({
      value: z
        .number({ invalid_type_error: "Enter a goal value" })
        .positive("Goal must be greater than zero")
        .max(1_000_000, "That goal looks too large"),
      unit: z.enum(GOAL_UNITS),
    }),
    startDate: dateString,
    endDate: dateString,
  })
  .refine((c) => c.endDate >= c.startDate, {
    message: "End date must not be before the start date",
    path: ["endDate"],
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
