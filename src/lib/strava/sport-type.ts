import type { SportType } from "@/types";

/**
 * Strava's sport_type taxonomy is much broader than our SportType enum
 * (goal challenges only support one sport per challenge, so we keep the
 * list small). Unlisted Strava types — and anything not worth a distinct
 * bucket — fall through to "Other".
 */
const STRAVA_SPORT_TYPE_MAP: Record<string, SportType> = {
  Run: "Run",
  TrailRun: "Run",
  VirtualRun: "Run",
  Ride: "Ride",
  MountainBikeRide: "Ride",
  GravelRide: "Ride",
  VirtualRide: "Ride",
  EBikeRide: "Ride",
  EMountainBikeRide: "Ride",
  Handcycle: "Ride",
  Swim: "Swim",
  Walk: "Walk",
  Hike: "Hike",
  WeightTraining: "WeightTraining",
  Workout: "WeightTraining",
  Crossfit: "WeightTraining",
  HighIntensityIntervalTraining: "WeightTraining",
  Yoga: "Yoga",
};

/** Maps a Strava activity's sport_type onto our narrower SportType enum. */
export function mapStravaSportType(stravaSportType: string): SportType {
  return STRAVA_SPORT_TYPE_MAP[stravaSportType] ?? "Other";
}
