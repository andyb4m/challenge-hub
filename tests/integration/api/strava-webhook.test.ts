import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindUidByAthleteId, mockSyncStravaActivity, mockRemoveStravaActivity, mockUpdate, mockDoc, mockCollection } =
  vi.hoisted(() => {
    const mockUpdate = vi.fn(async () => {});
    const mockDoc = vi.fn(() => ({ update: mockUpdate }));
    const mockCollection = vi.fn(() => ({ doc: mockDoc }));
    return {
      mockFindUidByAthleteId: vi.fn(),
      mockSyncStravaActivity: vi.fn(async () => {}),
      mockRemoveStravaActivity: vi.fn(async () => {}),
      mockUpdate,
      mockDoc,
      mockCollection,
    };
  });

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => ({ collection: mockCollection }),
}));

vi.mock("@/lib/strava/sync", () => ({
  findUidByAthleteId: mockFindUidByAthleteId,
  syncStravaActivity: mockSyncStravaActivity,
  removeStravaActivity: mockRemoveStravaActivity,
}));

import { GET, POST } from "@/app/api/strava/webhook/route";

function makePostRequest(body: unknown) {
  return new Request("http://localhost/api/strava/webhook", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("GET /api/strava/webhook (subscription validation)", () => {
  beforeEach(() => {
    vi.stubEnv("STRAVA_WEBHOOK_VERIFY_TOKEN", "test-verify-token");
  });

  it("echoes hub.challenge back when hub.verify_token matches", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/strava/webhook?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=test-verify-token"
      )
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ "hub.challenge": "abc123" });
  });

  it("returns 403 when hub.verify_token doesn't match", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/strava/webhook?hub.mode=subscribe&hub.challenge=abc123&hub.verify_token=wrong"
      )
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when hub.mode isn't subscribe", async () => {
    const res = await GET(
      new Request(
        "http://localhost/api/strava/webhook?hub.challenge=abc123&hub.verify_token=test-verify-token"
      )
    );
    expect(res.status).toBe(403);
  });
});

describe("POST /api/strava/webhook (events)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("syncs a create event for a connected athlete", async () => {
    mockFindUidByAthleteId.mockResolvedValue("uid-1");
    const res = await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "create",
        object_id: 999,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
        updates: {},
      })
    );
    expect(res.status).toBe(200);
    expect(mockSyncStravaActivity).toHaveBeenCalledWith("uid-1", 999);
    expect(mockRemoveStravaActivity).not.toHaveBeenCalled();
  });

  it("syncs an update event the same way as create", async () => {
    mockFindUidByAthleteId.mockResolvedValue("uid-1");
    await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "update",
        object_id: 999,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
        updates: { type: "Run" },
      })
    );
    expect(mockSyncStravaActivity).toHaveBeenCalledWith("uid-1", 999);
  });

  it("removes the activity on a delete event instead of syncing", async () => {
    mockFindUidByAthleteId.mockResolvedValue("uid-1");
    await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "delete",
        object_id: 999,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
        updates: {},
      })
    );
    expect(mockRemoveStravaActivity).toHaveBeenCalledWith("uid-1", 999);
    expect(mockSyncStravaActivity).not.toHaveBeenCalled();
  });

  it("no-ops (but still returns 200) when the athlete isn't connected to any user", async () => {
    mockFindUidByAthleteId.mockResolvedValue(null);
    const res = await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "create",
        object_id: 999,
        owner_id: 999999,
        subscription_id: 1,
        event_time: 1234567890,
        updates: {},
      })
    );
    expect(res.status).toBe(200);
    expect(mockSyncStravaActivity).not.toHaveBeenCalled();
  });

  it("clears the user's Strava connection on a deauthorization event", async () => {
    mockFindUidByAthleteId.mockResolvedValue("uid-1");
    const res = await POST(
      makePostRequest({
        object_type: "athlete",
        aspect_type: "update",
        object_id: 42,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
        updates: { authorized: "false" },
      })
    );
    expect(res.status).toBe(200);
    expect(mockCollection).toHaveBeenCalledWith("users");
    expect(mockDoc).toHaveBeenCalledWith("uid-1");
    expect(mockUpdate).toHaveBeenCalledWith({ strava: null });
  });

  it("ignores athlete events that aren't a deauthorization", async () => {
    await POST(
      makePostRequest({
        object_type: "athlete",
        aspect_type: "update",
        object_id: 42,
        owner_id: 42,
        subscription_id: 1,
        event_time: 1234567890,
        updates: { some_other_field: "value" },
      })
    );
    expect(mockFindUidByAthleteId).not.toHaveBeenCalled();
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe("POST /api/strava/webhook (subscription_id check)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("rejects events with a mismatched subscription_id when STRAVA_SUBSCRIPTION_ID is configured", async () => {
    vi.stubEnv("STRAVA_SUBSCRIPTION_ID", "999");
    mockFindUidByAthleteId.mockResolvedValue("uid-1");

    const res = await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "create",
        object_id: 1,
        owner_id: 42,
        subscription_id: 12345, // doesn't match
        event_time: 1234567890,
        updates: {},
      })
    );

    expect(res.status).toBe(403);
    expect(mockSyncStravaActivity).not.toHaveBeenCalled();
  });

  it("accepts events with a matching subscription_id when configured", async () => {
    vi.stubEnv("STRAVA_SUBSCRIPTION_ID", "12345");
    mockFindUidByAthleteId.mockResolvedValue("uid-1");

    const res = await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "create",
        object_id: 1,
        owner_id: 42,
        subscription_id: 12345,
        event_time: 1234567890,
        updates: {},
      })
    );

    expect(res.status).toBe(200);
    expect(mockSyncStravaActivity).toHaveBeenCalledWith("uid-1", 1);
  });

  it("skips the check entirely when STRAVA_SUBSCRIPTION_ID isn't configured", async () => {
    mockFindUidByAthleteId.mockResolvedValue("uid-1");

    const res = await POST(
      makePostRequest({
        object_type: "activity",
        aspect_type: "create",
        object_id: 1,
        owner_id: 42,
        subscription_id: 999999,
        event_time: 1234567890,
        updates: {},
      })
    );

    expect(res.status).toBe(200);
    expect(mockSyncStravaActivity).toHaveBeenCalledWith("uid-1", 1);
  });
});
