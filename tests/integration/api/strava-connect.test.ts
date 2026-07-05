import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyIdToken } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

import { GET } from "@/app/api/strava/connect/route";

function makeRequest(token?: string) {
  return new Request("http://localhost/api/strava/connect", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/strava/connect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STRAVA_CLIENT_SECRET", "test-secret");
    vi.stubEnv("NEXT_PUBLIC_STRAVA_CLIENT_ID", "12345");
    vi.stubEnv("NEXT_PUBLIC_BASE_URL", "http://localhost:3000");
  });

  it("returns 401 without an auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
  });

  it("returns 401 when the token doesn't verify", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));
    const res = await GET(makeRequest("bad"));
    expect(res.status).toBe(401);
  });

  it("returns a Strava authorize URL signed for the caller's uid", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    const res = await GET(makeRequest("good"));

    expect(res.status).toBe(200);
    const { url } = await res.json();
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://www.strava.com/oauth/authorize"
    );
    expect(parsed.searchParams.get("client_id")).toBe("12345");
    expect(parsed.searchParams.get("state")?.startsWith("u1.")).toBe(true);
  });
});
