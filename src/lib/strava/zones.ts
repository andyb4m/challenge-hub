export type ZoneMinutes = { z2: number; z3: number; z4: number; z5: number };

/** Raw per-sample heart-rate stream from GET /activities/{id}/streams. */
export interface HeartRateStream {
  /** Seconds since activity start, one per sample. */
  time: number[];
  /** bpm, one per sample, same length and order as `time`. */
  heartrate: number[];
}

/**
 * Classic %-of-max-HR zone model — matches a Garmin zone chart (Z1
 * 50-60%, Z2 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%+). Z1 and below
 * are outside our range and dropped, same as the rest of this app's
 * model having no Z1 at all. Boundaries are inclusive on the low end.
 */
function zoneForPercent(percentOfMax: number): keyof ZoneMinutes | null {
  if (percentOfMax >= 0.9) return "z5";
  if (percentOfMax >= 0.8) return "z4";
  if (percentOfMax >= 0.7) return "z3";
  if (percentOfMax >= 0.6) return "z2";
  return null;
}

/**
 * Computes zone-training minutes directly from a raw heart-rate stream
 * against the athlete's own max HR, rather than trusting Strava's
 * `/activities/{id}/zones` endpoint — that endpoint reflects whatever
 * zone boundaries Strava has on file (the athlete's custom Strava zones,
 * or Strava's own default), which aren't guaranteed to match the
 * classic %-of-max-HR model this app (and Garmin) uses. Computing it
 * ourselves also means it doesn't depend on a Strava Summit subscription
 * the way that endpoint does.
 *
 * Returns null if there's no usable stream data at all (no HR monitor
 * for this activity, or a malformed/empty stream) — the activity should
 * then be skipped for zone-challenge purposes entirely, not counted
 * with a guessed value. maxHeartRate must be a positive number; callers
 * should skip this entirely when the athlete hasn't set one (see
 * User.maxHeartRate).
 */
export function computeZoneMinutesFromStream(
  stream: HeartRateStream,
  maxHeartRate: number
): ZoneMinutes | null {
  const { time, heartrate } = stream;
  if (
    time.length === 0 ||
    heartrate.length === 0 ||
    time.length !== heartrate.length ||
    maxHeartRate <= 0
  ) {
    return null;
  }

  const minutes: ZoneMinutes = { z2: 0, z3: 0, z4: 0, z5: 0 };
  for (let i = 0; i < heartrate.length; i++) {
    const zone = zoneForPercent(heartrate[i] / maxHeartRate);
    if (!zone) continue;
    // Duration this sample represents: time until the next sample (clamped
    // at 0 in case a stream ever arrives out of order). The last sample
    // gets no duration (nothing to bound it by) rather than guessing — a
    // one-sample undercount is negligible.
    const gap = i < time.length - 1 ? time[i + 1] - time[i] : 0;
    minutes[zone] += Math.max(gap, 0) / 60;
  }
  return minutes;
}
