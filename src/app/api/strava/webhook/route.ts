import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { verifyStravaWebhookChallenge } from "@/lib/strava/webhook";
import {
  findUidByAthleteId,
  removeStravaActivity,
  syncStravaActivity,
} from "@/lib/strava/sync";
import type { StravaWebhookEvent } from "@/types";

/**
 * Strava's one-time subscription validation handshake — see
 * verifyStravaWebhookChallenge for why there's no per-event signature.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const challenge = url.searchParams.get("hub.challenge");
  const verifyToken = url.searchParams.get("hub.verify_token");

  if (mode === "subscribe" && challenge && verifyStravaWebhookChallenge(verifyToken)) {
    return NextResponse.json({ "hub.challenge": challenge });
  }

  return NextResponse.json({ error: "invalid verification request" }, { status: 403 });
}

/**
 * Activity/athlete events. Always returns 200 for well-formed requests —
 * even when we can't resolve the athlete to a connected user — so Strava
 * doesn't keep retrying events that will never resolve.
 *
 * We never trust the event body's activity data directly (there's no
 * signature to verify it came from Strava unmodified); syncStravaActivity
 * re-fetches the canonical activity from Strava's API using our own
 * stored access token before writing anything, and removeStravaActivity
 * re-verifies a claimed deletion the same way before acting on it.
 *
 * Optional extra check: if STRAVA_SUBSCRIPTION_ID is set (the id Strava
 * returned when the push_subscription was registered), reject events
 * whose subscription_id doesn't match. This can't be verified for the
 * athlete-deauthorization event below (a deauthorized token can't be
 * used to ask Strava anything), so it's the only compensating control
 * available for that specific case.
 */
export async function POST(request: Request) {
  const event = (await request.json()) as StravaWebhookEvent;

  const expectedSubscriptionId = process.env.STRAVA_SUBSCRIPTION_ID;
  if (
    expectedSubscriptionId &&
    String(event.subscription_id) !== expectedSubscriptionId
  ) {
    return NextResponse.json({ error: "unknown subscription" }, { status: 403 });
  }

  if (event.object_type === "athlete") {
    if (event.updates?.authorized === "false") {
      const uid = await findUidByAthleteId(event.owner_id);
      if (uid) {
        await adminDb().collection(COLLECTIONS.users).doc(uid).update({ strava: null });
      }
    }
    return NextResponse.json({ ok: true });
  }

  if (event.object_type === "activity") {
    const uid = await findUidByAthleteId(event.owner_id);
    if (uid) {
      if (event.aspect_type === "delete") {
        await removeStravaActivity(uid, event.object_id);
      } else {
        await syncStravaActivity(uid, event.object_id);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
