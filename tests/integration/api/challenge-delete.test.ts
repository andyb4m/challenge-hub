import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockVerifyIdToken,
  mockChallengeGet,
  mockMembersGet,
  mockActivitiesGet,
  mockBatchDelete,
  mockBatchSet,
  mockBatchCommit,
} = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockChallengeGet: vi.fn(),
  mockMembersGet: vi.fn(),
  mockActivitiesGet: vi.fn(),
  mockBatchDelete: vi.fn(),
  mockBatchSet: vi.fn(),
  mockBatchCommit: vi.fn(async () => {}),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { arrayRemove: (v: string) => ({ __arrayRemove: v }) },
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
  adminDb: () => ({
    collection: (path: string) => {
      if (path === "users") {
        return { doc: (uid: string) => ({ __path: `users/${uid}` }) };
      }
      if (path === "challenges") {
        return {
          doc: (id: string) => ({
            __path: `challenges/${id}`,
            get: mockChallengeGet,
          }),
        };
      }
      if (path.endsWith("/members")) {
        return { get: mockMembersGet };
      }
      return { get: mockActivitiesGet }; // .../activities
    },
    batch: () => ({
      delete: mockBatchDelete,
      set: mockBatchSet,
      commit: mockBatchCommit,
    }),
  }),
}));

import { DELETE } from "@/app/api/challenges/[id]/route";

function makeRequest(id: string, token?: string) {
  const req = new Request(`http://localhost/api/challenges/${id}`, {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  return { req, params: { id } };
}

describe("DELETE /api/challenges/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMembersGet.mockResolvedValue({ docs: [] });
    mockActivitiesGet.mockResolvedValue({ docs: [] });
  });

  it("returns 401 without an auth header", async () => {
    const { req, params } = makeRequest("c1");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't verify", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));
    const { req, params } = makeRequest("c1", "bad");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the challenge doesn't exist", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "creator" });
    mockChallengeGet.mockResolvedValue({ exists: false });
    const { req, params } = makeRequest("ghost", "good");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(404);
  });

  it("returns 403 for a non-creator", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "friend" });
    mockChallengeGet.mockResolvedValue({
      exists: true,
      data: () => ({ createdBy: "creator" }),
    });
    const { req, params } = makeRequest("c1", "good");
    const res = await DELETE(req, { params });
    expect(res.status).toBe(403);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("deletes the challenge, every member doc, their activities, and removes the challengeId from each member's own user doc", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "creator" });
    mockChallengeGet.mockResolvedValue({
      exists: true,
      data: () => ({ createdBy: "creator" }),
    });
    mockMembersGet.mockResolvedValue({
      docs: [
        { id: "creator", ref: "member-ref-creator" },
        { id: "friend", ref: "member-ref-friend" },
      ],
    });
    mockActivitiesGet.mockResolvedValue({
      docs: [{ ref: "activity-ref-1" }, { ref: "activity-ref-2" }],
    });

    const { req, params } = makeRequest("c1", "good");
    const res = await DELETE(req, { params });

    expect(res.status).toBe(200);
    expect(mockBatchDelete).toHaveBeenCalledWith({
      __path: "challenges/c1",
      get: mockChallengeGet,
    });
    expect(mockBatchDelete).toHaveBeenCalledWith("member-ref-creator");
    expect(mockBatchDelete).toHaveBeenCalledWith("member-ref-friend");
    expect(mockBatchDelete).toHaveBeenCalledWith("activity-ref-1");
    expect(mockBatchDelete).toHaveBeenCalledWith("activity-ref-2");
    expect(mockBatchSet).toHaveBeenCalledWith(
      { __path: "users/creator" },
      { challengeIds: { __arrayRemove: "c1" } },
      { merge: true }
    );
    expect(mockBatchSet).toHaveBeenCalledWith(
      { __path: "users/friend" },
      { challengeIds: { __arrayRemove: "c1" } },
      { merge: true }
    );
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
