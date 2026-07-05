export interface StravaZoneDistributionBucket {
  min: number;
  max: number;
  time: number; // seconds
}

export interface StravaZoneDistribution {
  type: string; // "heartrate" | "power" | ...
  distribution_buckets: StravaZoneDistributionBucket[];
}

export type ZoneMinutes = { z2: number; z3: number; z4: number; z5: number };

/**
 * Maps Strava's heart-rate zone time distribution onto our Z2-Z5 model.
 * Strava's 5 HR zones, like ours, are personalized per athlete off their
 * own max HR rather than a fixed global model, so a direct positional
 * mapping holds: bucket 0 is Strava Zone 1 (below our range — dropped
 * entirely, same as our model having no Z1 at all), buckets 1-4 are
 * Zones 2-5.
 *
 * Returns null if there's no heart-rate distribution at all (no HR
 * monitor used for this activity, or the athlete hasn't configured zones
 * on Strava) — the activity should then be skipped for zone-challenge
 * purposes entirely, not counted with a guessed value.
 */
export function mapStravaHeartrateZones(
  distributions: StravaZoneDistribution[]
): ZoneMinutes | null {
  const heartrate = distributions.find((d) => d.type === "heartrate");
  if (!heartrate || heartrate.distribution_buckets.length < 5) return null;

  const buckets = heartrate.distribution_buckets;
  const minutes = (seconds: number) => seconds / 60;

  return {
    z2: minutes(buckets[1].time),
    z3: minutes(buckets[2].time),
    z4: minutes(buckets[3].time),
    z5: minutes(buckets[4].time),
  };
}
