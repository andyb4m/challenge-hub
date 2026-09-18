import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockVerifyIdToken, mockUsersGet, mockChallengesGet, mockActivitiesGet } =
  vi.hoisted(() => ({
    mockVerifyIdToken: vi.fn(),
    mockUsersGet: vi.fn(),
    mockChallengesGet: vi.fn(),
    mockActivitiesGet: vi.fn(),
  }));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  adminDb: () => ({
    collection: (path: string) => {
      if (path === "users") return { get: mockUsersGet };
      if (path === "challenges") return { get: mockChallengesGet };
      return { get: mockActivitiesGet }; // challenges/{id}/activities
    },
  }),
}));

import { GET } from "@/app/api/admin/dashboard/route";

function makeRequest(token?: string) {
  return new Request("http://localhost/api/admin/dashboard", {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsersGet.mockResolvedValue({ docs: [] });
    mockChallengesGet.mockResolvedValue({ docs: [] });
    mockActivitiesGet.mockResolvedValue({ docs: [] });
    vi.stubEnv("ADMIN_EMAIL", "andreas@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without an auth header", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't verify", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));
    const res = await GET(makeRequest("bad"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a valid but non-admin token", async () => {
    mockVerifyIdToken.mockResolvedValue({ email: "friend@example.com" });
    const res = await GET(makeRequest("good"));
    expect(res.status).toBe(403);
    expect(mockUsersGet).not.toHaveBeenCalled();
  });

  it("returns 403 when ADMIN_EMAIL isn't configured, even for a token with no email", async () => {
    vi.stubEnv("ADMIN_EMAIL", "");
    mockVerifyIdToken.mockResolvedValue({ email: undefined });
    const res = await GET(makeRequest("good"));
    expect(res.status).toBe(403);
  });

  it("returns the aggregated dashboard for the admin", async () => {
    mockVerifyIdToken.mockResolvedValue({ email: "Andreas@Example.com" }); // case-insensitive match
    mockUsersGet.mockResolvedValue({
      docs: [
        {
          data: () => ({
            uid: "u1",
            displayName: "Andreas",
            email: "andreas@example.com",
            createdAt: "2026-09-01T00:00:00.000Z",
            strava: null,
            challengeIds: ["c1"],
          }),
        },
      ],
    });
    mockChallengesGet.mockResolvedValue({
      docs: [
        {
          id: "c1",
          data: () => ({
            name: "Test Challenge",
            scoring: "goal",
            startDate: "2026-09-01",
            endDate: "2026-09-30",
            memberCount: 1,
          }),
        },
      ],
    });
    mockActivitiesGet.mockResolvedValue({
      docs: [{ data: () => ({ uid: "u1", source: "manual", startDate: "2026-09-10T00:00:00.000Z" }) }],
    });

    const res = await GET(makeRequest("good"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stats.totalUsers).toBe(1);
    expect(body.stats.totalChallenges).toBe(1);
    expect(body.stats.totalActivities).toBe(1);
    expect(body.users).toHaveLength(1);
    expect(body.users[0]).toMatchObject({ uid: "u1", activityCount: 1 });
  });
});
