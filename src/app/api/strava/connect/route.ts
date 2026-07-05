import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { buildStravaAuthUrl } from "@/lib/strava/oauth";

/**
 * Returns a signed Strava OAuth authorize URL for the caller. A plain
 * <a href> can't carry an Authorization header, and signing the state
 * needs STRAVA_CLIENT_SECRET (server-only) — so the client fetches this
 * first, then navigates the browser to the returned url.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let uid: string;
  try {
    ({ uid } = await adminAuth().verifyIdToken(idToken));
  } catch {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  return NextResponse.json({ url: buildStravaAuthUrl(uid) });
}
