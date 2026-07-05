import crypto from "crypto";

const STRAVA_AUTHORIZE_URL = "https://www.strava.com/oauth/authorize";
const STRAVA_TOKEN_URL = "https://www.strava.com/oauth/token";

/**
 * Signs the uid into the OAuth state param so the callback can trust it.
 * Without this, anyone who knows a member's uid (visible to fellow
 * challenge members via their member docs) could craft a callback URL
 * with someone else's uid as state and link their own Strava account to
 * that person's Challenge Hub account. Server-only (needs
 * STRAVA_CLIENT_SECRET) — never call from client code.
 */
function signState(uid: string): string {
  const signature = crypto
    .createHmac("sha256", process.env.STRAVA_CLIENT_SECRET ?? "")
    .update(uid)
    .digest("hex");
  return `${uid}.${signature}`;
}

/** Verifies a signed state param, returning the uid if valid, else null. */
export function verifyState(state: string): string | null {
  const separatorIndex = state.indexOf(".");
  if (separatorIndex === -1) return null;

  const uid = state.slice(0, separatorIndex);
  const signature = state.slice(separatorIndex + 1);
  const expectedSignature = signState(uid).slice(uid.length + 1);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (signatureBuffer.length !== expectedBuffer.length) return null;

  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer) ? uid : null;
}

/** Server-only — needs STRAVA_CLIENT_SECRET to sign state; never call from client code. */
export function buildStravaAuthUrl(uid: string): string {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_STRAVA_CLIENT_ID ?? "",
    redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL}/api/strava/callback`,
    response_type: "code",
    scope: "activity:read_all",
    state: signState(uid),
  });
  return `${STRAVA_AUTHORIZE_URL}?${params.toString()}`;
}

export interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string;
  };
}

export async function exchangeCodeForTokens(
  code: string
): Promise<StravaTokenResponse> {
  const res = await fetch(STRAVA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    throw new Error(`Strava token exchange failed: ${res.status}`);
  }

  return res.json() as Promise<StravaTokenResponse>;
}
