import crypto from "crypto";

/**
 * Verifies Strava's one-time webhook subscription validation handshake.
 * When a push_subscription is created, Strava sends a GET request to the
 * callback URL with hub.mode/hub.challenge/hub.verify_token query params;
 * the callback must echo hub.challenge back, but only if hub.verify_token
 * matches the token we registered the subscription with. There is no
 * per-event signature on the POST events themselves (unlike many other
 * webhook APIs) — see https://developers.strava.com/docs/webhooks/.
 */
export function verifyStravaWebhookChallenge(
  verifyToken: string | null
): boolean {
  const expected = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;
  if (!expected || !verifyToken) return false;

  const provided = Buffer.from(verifyToken);
  const expectedBuffer = Buffer.from(expected);
  if (provided.length !== expectedBuffer.length) return false;

  return crypto.timingSafeEqual(provided, expectedBuffer);
}
