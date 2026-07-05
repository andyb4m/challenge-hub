import { describe, it, expect, beforeEach, vi } from "vitest";
import { verifyStravaWebhookChallenge } from "@/lib/strava/webhook";

const VERIFY_TOKEN = "test-webhook-verify-token";

beforeEach(() => {
  vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", VERIFY_TOKEN);
});

describe("verifyStravaWebhookChallenge", () => {
  it("returns true when hub.verify_token matches", () => {
    expect(verifyStravaWebhookChallenge(VERIFY_TOKEN)).toBe(true);
  });

  it("returns false for a mismatched token", () => {
    expect(verifyStravaWebhookChallenge("wrong-token")).toBe(false);
  });

  it("returns false when hub.verify_token is missing", () => {
    expect(verifyStravaWebhookChallenge(null)).toBe(false);
  });

  it("returns false when STRAVA_WEBHOOK_VERIFY_TOKEN is not configured", () => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "");
    expect(verifyStravaWebhookChallenge(VERIFY_TOKEN)).toBe(false);
  });
});
