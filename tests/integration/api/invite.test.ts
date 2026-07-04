import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGet, mockLimit, mockWhere, mockCollection } = vi.hoisted(() => {
  const mockGet = vi.fn();
  const mockLimit = vi.fn(() => ({ get: mockGet }));
  const mockWhere = vi.fn(() => ({ limit: mockLimit }));
  const mockCollection = vi.fn(() => ({ where: mockWhere }));
  return { mockGet, mockLimit, mockWhere, mockCollection };
});

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({ collection: mockCollection }),
}));

import { GET } from "@/app/api/invite/[token]/route";

describe("GET /api/invite/[token]", () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockCollection.mockClear();
  });

  it("returns the challenge when the token matches", async () => {
    mockGet.mockResolvedValue({
      empty: false,
      docs: [
        {
          id: "c1",
          data: () => ({ name: "Summer Run", inviteToken: "abc123" }),
        },
      ],
    });

    const res = await GET(new Request("http://localhost/api/invite/abc123"), {
      params: { token: "abc123" },
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      id: "c1",
      name: "Summer Run",
      inviteToken: "abc123",
    });
    expect(mockWhere).toHaveBeenCalledWith("inviteToken", "==", "abc123");
  });

  it("returns 404 when no challenge matches the token", async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] });

    const res = await GET(new Request("http://localhost/api/invite/nope"), {
      params: { token: "nope" },
    });

    expect(res.status).toBe(404);
  });
});
