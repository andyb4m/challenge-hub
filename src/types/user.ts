export interface StravaConnection {
  athleteId: number;
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix timestamp (seconds)
  connectedAt: string; // ISO 8601
}

export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string | null;
  createdAt: string; // ISO 8601
  strava: StravaConnection | null;
  /**
   * Ids of challenges this user has joined. Kept on the user doc so the
   * challenge list needs no collection-group query/index.
   * May be absent on docs created before challenges existed — read with
   * `?? []`.
   */
  challengeIds?: string[];
  /**
   * Daily counter for the zone-screenshot scan feature — a defense-in-
   * depth cost guard, since registration is open and the scan calls a
   * paid API (see checkAndIncrementScanLimit, zone-screenshot.ts). No
   * separate deletion path needed: removed with the rest of the user
   * doc on account deletion.
   */
  screenshotScans?: { date: string; count: number };
  /**
   * Self-reported max heart rate (bpm), set on /profile. Required for
   * Strava zone-training sync: we compute zone minutes ourselves from the
   * raw heart-rate stream against the classic %-of-max-HR model (Z2
   * 60-70%, Z3 70-80%, Z4 80-90%, Z5 90-100%+ — matches a Garmin zone
   * chart), rather than trusting Strava's own zone boundaries, which may
   * not use the same model. Unset = zone sync is skipped for this user,
   * same treatment as "no HR monitor" (see computeZoneMinutesFromStream,
   * src/lib/strava/zones.ts). No separate deletion path needed — removed
   * with the rest of the user doc on account deletion.
   */
  maxHeartRate?: number | null;
}
