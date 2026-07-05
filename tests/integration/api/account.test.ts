import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockVerifyIdToken,
  mockDeleteUser,
  mockBatchDelete,
  mockBatchUpdate,
  mockBatchCommit,
  mockDoc,
  mockWhere,
  mockGet,
  mockUserGet,
  mockUserDelete,
} = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockDeleteUser: vi.fn(),
  mockBatchDelete: vi.fn(),
  mockBatchUpdate: vi.fn(),
  mockBatchCommit: vi.fn(async () => {}),
  mockDoc: vi.fn((path: string) => ({ __path: path })),
  mockWhere: vi.fn(),
  mockGet: vi.fn(),
  mockUserGet: vi.fn(),
  mockUserDelete: vi.fn(),
}));

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({
    verifyIdToken: mockVerifyIdToken,
    deleteUser: mockDeleteUser,
  }),
  adminDb: () => ({
    collection: (path: string) => {
      if (path === "users") {
        return { doc: () => ({ get: mockUserGet, delete: mockUserDelete }) };
      }
      if (path === "challenges") {
        return { doc: (id: string) => ({ __path: `challenges/${id}` }) };
      }
      return {
        where: (field: string, op: string, value: string) => {
          mockWhere(path, field, op, value);
          return { get: mockGet };
        },
      };
    },
    doc: mockDoc,
    batch: () => ({
      delete: mockBatchDelete,
      update: mockBatchUpdate,
      commit: mockBatchCommit,
    }),
  }),
}));

import { DELETE } from "@/app/api/account/route";

function makeRequest(token?: string) {
  return new Request("http://localhost/api/account", {
    method: "DELETE",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
}

describe("DELETE /api/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
  });

  it("returns 401 without an auth header", async () => {
    const res = await DELETE(makeRequest());
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't verify", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));
    const res = await DELETE(makeRequest("bad"));
    expect(res.status).toBe(401);
  });

  it("deletes member docs, own activities, and memberCount per challenge, then the user and auth account", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    mockUserGet.mockResolvedValue({
      exists: true,
      data: () => ({ challengeIds: ["c1", "c2"] }),
    });
    mockGet.mockResolvedValue({ docs: [{ ref: "activity-ref" }] });

    const res = await DELETE(makeRequest("good"));

    expect(res.status).toBe(200);
    expect(mockBatchCommit).toHaveBeenCalledTimes(2);
    expect(mockDoc).toHaveBeenCalledWith("challenges/c1/members/u1");
    expect(mockDoc).toHaveBeenCalledWith("challenges/c2/members/u1");
    expect(mockBatchUpdate).toHaveBeenCalledWith(
      { __path: "challenges/c1" },
      { memberCount: { __increment: -1 } }
    );
    expect(mockWhere).toHaveBeenCalledWith(
      "challenges/c1/activities",
      "uid",
      "==",
      "u1"
    );
    expect(mockBatchDelete).toHaveBeenCalledWith("activity-ref");
    expect(mockUserDelete).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith("u1");
  });

  it("skips the challenge loop and still deletes the account when the user has no challenges", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u2" });
    mockUserGet.mockResolvedValue({ exists: true, data: () => ({}) });

    const res = await DELETE(makeRequest("good"));

    expect(res.status).toBe(200);
    expect(mockBatchCommit).not.toHaveBeenCalled();
    expect(mockUserDelete).toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith("u2");
  });
});
