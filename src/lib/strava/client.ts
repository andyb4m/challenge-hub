import type { StravaActivity } from "@/types";
import type { HeartRateStream } from "@/lib/strava/zones";

const STRAVA_API_BASE = "https://www.strava.com/api/v3";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

export interface TokenSet {
  accessToken: string;
  refreshToken: string;
  expiresAt: number; // unix seconds
}

function isTokenExpiringSoon(expiresAt: number): boolean {
  return expiresAt < Date.now() / 1000 + 300;
}

export async function refreshStravaToken(refreshToken: string): Promise<TokenSet> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token refresh failed: ${res.status}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_at: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_at,
  };
}

export async function getValidToken(tokens: TokenSet): Promise<TokenSet> {
  if (!isTokenExpiringSoon(tokens.expiresAt)) return tokens;
  return refreshStravaToken(tokens.refreshToken);
}

/**
 * Fetches the canonical activity from Strava. Returns null on a 404 (the
 * activity doesn't exist / was deleted) so callers can distinguish
 * "confirmed gone" from a transient error — important for webhook delete
 * events, which have no signature and must be re-verified against the
 * API rather than trusted at face value.
 */
export async function fetchStravaActivity(
  accessToken: string,
  activityId: number
): Promise<StravaActivity | null> {
  const res = await fetch(`${STRAVA_API_BASE}/activities/${activityId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Strava activity fetch failed: ${res.status}`);
  }

  return res.json() as Promise<StravaActivity>;
}

interface StravaStreamSet {
  time?: { data: number[] };
  heartrate?: { data: number[] };
}

/**
 * Raw time + heart-rate streams for an activity, for computing zone
 * minutes ourselves (see computeZoneMinutesFromStream, strava/zones.ts)
 * rather than trusting Strava's own /activities/{id}/zones endpoint —
 * that one reflects Strava's own zone boundaries (which may not match
 * the %-of-max-HR model this app uses) and requires a Strava Summit
 * subscription; streams requires neither.
 *
 * Returns null when there's no heart-rate data at all — a 404 (no
 * streams at all, e.g. a manually created activity), or a 200 whose
 * response simply has no `heartrate` key (recorded without an HR
 * monitor) — treated the same as "nothing to compute zones from",
 * same convention as a missing zone distribution used to be.
 */
export async function fetchActivityStreams(
  accessToken: string,
  activityId: number
): Promise<HeartRateStream | null> {
  const res = await fetch(
    `${STRAVA_API_BASE}/activities/${activityId}/streams?keys=time,heartrate&key_by_type=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`Strava streams fetch failed: ${res.status}`);
  }

  const streams = (await res.json()) as StravaStreamSet;
  if (!streams.time?.data || !streams.heartrate?.data) return null;

  return { time: streams.time.data, heartrate: streams.heartrate.data };
}

export async function fetchRecentActivities(
  accessToken: string,
  afterTimestamp: number
): Promise<StravaActivity[]> {
  const url = new URL(`${STRAVA_API_BASE}/athlete/activities`);
  url.searchParams.set("after", String(afterTimestamp));
  url.searchParams.set("per_page", "100");

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Strava activities fetch failed: ${res.status}`);
  }

  return res.json() as Promise<StravaActivity[]>;
}
