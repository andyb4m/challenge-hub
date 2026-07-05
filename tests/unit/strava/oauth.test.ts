import { describe, it, expect, beforeEach, vi } from "vitest";
import { buildStravaAuthUrl, verifyState } from "@/lib/strava/oauth";

beforeEach(() => {
  vi.stubEnv("STRAVA_CLIENT_SECRET", "test-client-secret");
  vi.stubEnv("NEXT_PUBLIC_STRAVA_CLIENT_ID", "12345");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
});

describe("buildStravaAuthUrl / verifyState", () => {
  it("round-trips: a uid signed into the auth URL verifies back to the same uid", () => {
    const url = buildStravaAuthUrl("user-abc");
    const state = new URL(url).searchParams.get("state")!;
    expect(verifyState(state)).toBe("user-abc");
  });

  it("rejects a state with a tampered uid", () => {
    const url = buildStravaAuthUrl("user-abc");
    const state = new URL(url).searchParams.get("state")!;
    const [, signature] = state.split(".");
    expect(verifyState(`someone-else.${signature}`)).toBeNull();
  });

  it("rejects a state with a tampered signature", () => {
    expect(verifyState("user-abc.not-a-real-signature")).toBeNull();
  });

  it("rejects malformed state with no separator", () => {
    expect(verifyState("no-dot-here")).toBeNull();
  });

  it("signs a different uid differently", () => {
    const stateA = new URL(buildStravaAuthUrl("uid-a")).searchParams.get("state")!;
    const stateB = new URL(buildStravaAuthUrl("uid-b")).searchParams.get("state")!;
    expect(stateA).not.toBe(stateB);
  });
});
