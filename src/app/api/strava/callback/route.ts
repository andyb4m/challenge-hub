import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { exchangeCodeForTokens, verifyState } from "@/lib/strava/oauth";
import { backfillStravaActivities } from "@/lib/strava/sync";

/**
 * Strava redirects the browser here after the user authorizes (or
 * denies) the connection. Verifies the signed state param, exchanges the
 * code for tokens, stores the connection, then backfills recent
 * activities before redirecting back to /profile — all awaited inline
 * rather than fired in the background, since serverless functions aren't
 * guaranteed to keep running after the response is sent.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const profileUrl = new URL("/profile", url.origin);

  const uid = state ? verifyState(state) : null;
  if (!code || !uid) {
    profileUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(profileUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await adminDb()
      .collection(COLLECTIONS.users)
      .doc(uid)
      .update({
        strava: {
          athleteId: tokens.athlete.id,
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: tokens.expires_at,
          connectedAt: new Date().toISOString(),
        },
      });

    await backfillStravaActivities(uid);
  } catch (err) {
    console.error("Strava connect failed:", err);
    profileUrl.searchParams.set("strava", "error");
    return NextResponse.redirect(profileUrl);
  }

  profileUrl.searchParams.set("strava", "connected");
  return NextResponse.redirect(profileUrl);
}
