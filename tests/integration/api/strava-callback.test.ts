import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockVerifyState,
  mockExchangeCodeForTokens,
  mockBackfillStravaActivities,
  mockUpdate,
  mockDoc,
  mockCollection,
} = vi.hoisted(() => {
  const mockUpdate = vi.fn(async () => {});
  const mockDoc = vi.fn(() => ({ update: mockUpdate }));
  const mockCollection = vi.fn(() => ({ doc: mockDoc }));
  return {
    mockVerifyState: vi.fn(),
    mockExchangeCodeForTokens: vi.fn(),
    mockBackfillStravaActivities: vi.fn(async () => {}),
    mockUpdate,
    mockDoc,
    mockCollection,
  };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({ collection: mockCollection }),
}));

vi.mock("@/lib/strava/oauth", () => ({
  verifyState: mockVerifyState,
  exchangeCodeForTokens: mockExchangeCodeForTokens,
}));

vi.mock("@/lib/strava/sync", () => ({
  backfillStravaActivities: mockBackfillStravaActivities,
}));

import { GET } from "@/app/api/strava/callback/route";

function makeRequest(query: string) {
  return new Request(`http://localhost:3000/api/strava/callback${query}`);
}

describe("GET /api/strava/callback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects to /profile?strava=error when code is missing", async () => {
    const res = await GET(makeRequest("?state=abc"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/profile?strava=error");
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("redirects to /profile?strava=error when state is missing", async () => {
    const res = await GET(makeRequest("?code=abc"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/profile?strava=error");
    expect(mockVerifyState).not.toHaveBeenCalled();
  });

  it("redirects to /profile?strava=error when state doesn't verify", async () => {
    mockVerifyState.mockReturnValue(null);
    const res = await GET(makeRequest("?code=abc&state=bad"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/profile?strava=error");
    expect(mockExchangeCodeForTokens).not.toHaveBeenCalled();
  });

  it("redirects to /profile?strava=error when the token exchange fails", async () => {
    mockVerifyState.mockReturnValue("uid-1");
    mockExchangeCodeForTokens.mockRejectedValue(new Error("boom"));
    const res = await GET(makeRequest("?code=abc&state=uid-1.sig"));
    expect(res.headers.get("location")).toBe("http://localhost:3000/profile?strava=error");
  });

  it("stores the connection, backfills, and redirects to /profile?strava=connected", async () => {
    mockVerifyState.mockReturnValue("uid-1");
    mockExchangeCodeForTokens.mockResolvedValue({
      access_token: "access",
      refresh_token: "refresh",
      expires_at: 1234567890,
      athlete: { id: 42, firstname: "A", lastname: "B", profile: "" },
    });

    const res = await GET(makeRequest("?code=abc&state=uid-1.sig"));

    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("uid-1");
    expect(mockUpdate).toHaveBeenCalledWith({
      strava: {
        athleteId: 42,
        accessToken: "access",
        refreshToken: "refresh",
        expiresAt: 1234567890,
        connectedAt: expect.any(String),
      },
    });
    expect(mockBackfillStravaActivities).toHaveBeenCalledWith("uid-1");
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/profile?strava=connected"
    );
  });
});
