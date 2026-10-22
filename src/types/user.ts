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
}
