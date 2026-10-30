// @vitest-environment node
//
// jsdom's File/FormData implementation doesn't interoperate with
// Request.formData() the way Node's native (undici) versions do —
// appending a real File to FormData then reading it back inside the
// route handler hangs indefinitely under jsdom. This is the only test
// file in the suite that round-trips an actual file upload, hence the
// one-off environment override.
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockVerifyIdToken, mockCheckLimit, mockParseScreenshot } = vi.hoisted(() => ({
  mockVerifyIdToken: vi.fn(),
  mockCheckLimit: vi.fn(),
  mockParseScreenshot: vi.fn(),
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminAuth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

vi.mock("@/lib/challenges/zone-screenshot", async () => {
  const actual = await vi.importActual<typeof import("@/lib/challenges/zone-screenshot")>(
    "@/lib/challenges/zone-screenshot"
  );
  return {
    ...actual,
    checkAndIncrementScanLimit: mockCheckLimit,
    parseZoneScreenshot: mockParseScreenshot,
  };
});

import { POST } from "@/app/api/zones/parse-screenshot/route";

function makeRequest(options: { token?: string; file?: File } = {}) {
  const formData = new FormData();
  if (options.file) formData.append("image", options.file);
  return new Request("http://localhost/api/zones/parse-screenshot", {
    method: "POST",
    headers: options.token ? { authorization: `Bearer ${options.token}` } : {},
    body: formData,
  });
}

describe("POST /api/zones/parse-screenshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckLimit.mockResolvedValue(true);
  });

  it("returns 401 without an auth header", async () => {
    const res = await POST(makeRequest());
    expect(res.status).toBe(401);
    expect(mockVerifyIdToken).not.toHaveBeenCalled();
  });

  it("returns 401 when the token doesn't verify", async () => {
    mockVerifyIdToken.mockRejectedValue(new Error("bad token"));
    const res = await POST(makeRequest({ token: "bad" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when no image field is present", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    const res = await POST(makeRequest({ token: "good" }));
    expect(res.status).toBe(400);
    expect(mockCheckLimit).not.toHaveBeenCalled();
  });

  it("returns 400 for an unsupported file type", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    const file = new File(["x"], "doc.pdf", { type: "application/pdf" });
    const res = await POST(makeRequest({ token: "good", file }));
    expect(res.status).toBe(400);
    expect(mockCheckLimit).not.toHaveBeenCalled();
  });

  it("returns 400 for an oversized file", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    const big = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([big], "huge.png", { type: "image/png" });
    const res = await POST(makeRequest({ token: "good", file }));
    expect(res.status).toBe(400);
    expect(mockCheckLimit).not.toHaveBeenCalled();
  });

  it("returns 429 when the daily scan limit is hit, without calling the vision API", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    mockCheckLimit.mockResolvedValue(false);
    const file = new File(["img"], "zones.png", { type: "image/png" });
    const res = await POST(makeRequest({ token: "good", file }));
    expect(res.status).toBe(429);
    expect(mockParseScreenshot).not.toHaveBeenCalled();
  });

  it("checks the per-uid limit only after the upload itself is valid", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    const res = await POST(makeRequest({ token: "good" })); // no file
    expect(res.status).toBe(400);
    expect(mockCheckLimit).not.toHaveBeenCalled();
  });

  it("returns 200 with the parsed zones on success", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    mockParseScreenshot.mockResolvedValue({
      found: true,
      zones: { z2: 20, z3: 5, z4: 2, z5: 0 },
    });
    const file = new File(["img"], "zones.png", { type: "image/png" });
    const res = await POST(makeRequest({ token: "good", file }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      found: true,
      zones: { z2: 20, z3: 5, z4: 2, z5: 0 },
    });
    expect(mockParseScreenshot).toHaveBeenCalledWith(expect.any(String), "image/png");
  });

  it("returns 502 when the vision API call fails", async () => {
    mockVerifyIdToken.mockResolvedValue({ uid: "u1" });
    mockParseScreenshot.mockRejectedValue(new Error("upstream error"));
    const file = new File(["img"], "zones.png", { type: "image/png" });
    const res = await POST(makeRequest({ token: "good", file }));
    expect(res.status).toBe(502);
  });
});
