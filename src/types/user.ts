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
}
