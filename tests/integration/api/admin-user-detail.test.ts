import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockVerifyIdToken, mockUserGet, mockChallengeGet, mockActivitiesGet, mockWhere } =
  vi.hoisted(() => ({
    mockVerifyIdToken: vi.fn(),
    mockUserGet: vi.fn(),
    mockChallengeGet: vi.fn(),
    mockActivitiesGet: vi.fn(),
    mockWhere: vi.fn(),
  }));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  adminDb: () => ({
    collection: (path: string) => {
      if (path === "users") return { doc: () => ({ get: mockUserGet }) };
      if (path === "challenges") return { doc: () => ({ get: mockChallengeGet }) };
      // challenges/{id}/activities
      return {
        where: (...args: unknown[]) => {
          mockWhere(...args);
          return { get: mockActivitiesGet };
        },
      };
    },
  }),
}));

import { GET } from "@/app/api/admin/users/[uid]/route";

function makeRequest(uid: string, token?: string) {
  const req = new Request(`http://localhost/api/admin/users/${uid}`, {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { req, params: { uid } };
}

describe("GET /api/admin/users/[uid]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAIL", "andreas@example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 401 without an auth header", async () => {
    const { req, params } = makeRequest("u1");
    const res = await GET(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 403 for a non-admin token", async () => {
    mockVerifyIdToken.mockResolvedValue({ email: "friend@example.com" });
    const { req, params } = makeRequest("u1", "good");
    const res = await GET(req, { params });
    expect(res.status).toBe(403);
    expect(mockUserGet).not.toHaveBeenCalled();
  });

  it("returns 404 when the target user doesn't exist", async () => {
    mockVerifyIdToken.mockResolvedValue({ email: "andreas@example.com" });
    mockUserGet.mockResolvedValue({ exists: false });
    const { req, params } = makeRequest("ghost", "good");
    const res = await GET(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns the user's profile and activities across their challenges", async () => {
    mockVerifyIdToken.mockResolvedValue({ email: "andreas@example.com" });
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({
        uid: "u1",
        displayName: "Friend",
        email: "friend@example.com",
        photoURL: null,
        createdAt: "2026-09-01T00:00:00.000Z",
        strava: null,
        challengeIds: ["c1"],
      }),
    });
    mockChallengeGet.mockResolvedValue({
      exists: true,
      id: "c1",
      data: () => ({ name: "Test Challenge" }),
    });
    mockActivitiesGet.mockResolvedValue({
      docs: [
        {
          id: "a1",
          data: () => ({
            name: "Morning run",
            startDate: "2026-09-10T00:00:00.000Z",
            source: "manual",
            stravaActivityId: null,
          }),
        },
      ],
    });

    const { req, params } = makeRequest("u1", "good");
    const res = await GET(req, { params });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.user).toMatchObject({ uid: "u1", displayName: "Friend", challengeCount: 1 });
    expect(body.activities).toEqual([
      {
        id: "a1",
        challengeId: "c1",
        challengeName: "Test Challenge",
        name: "Morning run",
        startDate: "2026-09-10T00:00:00.000Z",
        source: "manual",
        stravaActivityId: null,
      },
    ]);
    expect(mockWhere).toHaveBeenCalledWith("uid", "==", "u1");
  });
});
