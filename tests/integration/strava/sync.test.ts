import { describe, it, expect, vi, beforeEach } from "vitest";

// --- A minimal in-memory Firestore fake, tailored to what sync.ts uses:
// collection(path).doc(id).get()/.update(), collection(path).where(...).get(),
// doc(path) as a batch target, and batch delete/update/set/commit.
const { fakeDb, fakeStore, mockFetchStravaActivity, mockFetchActivityStreams, mockGetValidToken, mockFetchRecentActivities } =
  vi.hoisted(() => {
    const store = new Map<string, any>();
    let counter = 0;

    function getPath(obj: any, parts: string[]) {
      return parts.reduce((acc, p) => (acc == null ? acc : acc[p]), obj);
    }

    function setPath(obj: any, parts: string[], value: any) {
      let current = obj;
      for (let i = 0; i < parts.length - 1; i++) {
        current[parts[i]] =
          typeof current[parts[i]] === "object" && current[parts[i]] !== null
            ? { ...current[parts[i]] }
            : {};
        current = current[parts[i]];
      }
      current[parts[parts.length - 1]] = value;
    }

    function applyUpdates(current: any, updates: Record<string, unknown>) {
      const result = { ...current };
      for (const [key, value] of Object.entries(updates)) {
        const parts = key.split(".");
        if (value && typeof value === "object" && "__increment" in (value as object)) {
          const existing = getPath(result, parts) ?? 0;
          setPath(result, parts, existing + (value as { __increment: number }).__increment);
        } else {
          setPath(result, parts, value);
        }
      }
      return result;
    }

    function fieldEquals(data: any, field: string, value: unknown): boolean {
      if (!data) return false;
      return getPath(data, field.split(".")) === value;
    }

    function childKeys(collectionPath: string): string[] {
      const prefix = `${collectionPath}/`;
      return [...store.keys()].filter(
        (key) => key.startsWith(prefix) && !key.slice(prefix.length).includes("/")
      );
    }

    function makeDocRef(path: string) {
      const id = path.slice(path.lastIndexOf("/") + 1);
      return {
        path,
        id,
        get: async () => ({
          id,
          exists: store.has(path),
          data: () => store.get(path),
        }),
        delete: async () => {
          store.delete(path);
        },
        update: async (updates: Record<string, unknown>) => {
          store.set(path, applyUpdates(store.get(path) ?? {}, updates));
        },
      };
    }

    function makeQuery(
      collectionPath: string,
      filters: Array<{ field: string; value: unknown }>,
      limitCount: number | null
    ) {
      return {
        where: (field: string, _op: string, value: unknown) =>
          makeQuery(collectionPath, [...filters, { field, value }], limitCount),
        limit: (n: number) => makeQuery(collectionPath, filters, n),
        get: async () => {
          let keys = childKeys(collectionPath).filter((key) =>
            filters.every((f) => fieldEquals(store.get(key), f.field, f.value))
          );
          if (limitCount !== null) keys = keys.slice(0, limitCount);
          return {
            empty: keys.length === 0,
            docs: keys.map((key) => ({
              id: key.slice(key.lastIndexOf("/") + 1),
              ref: makeDocRef(key),
              data: () => store.get(key),
            })),
          };
        },
      };
    }

    function makeCollectionRef(collectionPath: string) {
      return {
        doc: (id?: string) =>
          makeDocRef(`${collectionPath}/${id ?? `auto${++counter}`}`),
        where: (field: string, op: string, value: unknown) =>
          makeQuery(collectionPath, [{ field, value }], null),
      };
    }

    function makeOpsCollector() {
      const ops: Array<() => void> = [];
      return {
        ops,
        delete: (ref: ReturnType<typeof makeDocRef>) => {
          ops.push(() => store.delete(ref.path));
        },
        update: (ref: ReturnType<typeof makeDocRef>, data: Record<string, unknown>) => {
          ops.push(() => store.set(ref.path, applyUpdates(store.get(ref.path) ?? {}, data)));
        },
        set: (ref: ReturnType<typeof makeDocRef>, data: unknown) => {
          ops.push(() => store.set(ref.path, data));
        },
      };
    }

    const db = {
      collection: makeCollectionRef,
      doc: makeDocRef,
      batch: () => {
        const collector = makeOpsCollector();
        return {
          ...collector,
          commit: async () => {
            collector.ops.forEach((op) => op());
          },
        };
      },
      // Not a real transaction (no conflict detection/retry) - sufficient
      // for testing the sequential reconcile logic itself, just not true
      // concurrency behavior.
      runTransaction: async (updateFn: (tx: ReturnType<typeof makeOpsCollector> & { get: (q: any) => Promise<any> }) => Promise<void>) => {
        const collector = makeOpsCollector();
        const tx = { ...collector, get: async (queryOrRef: any) => queryOrRef.get() };
        const result = await updateFn(tx);
        collector.ops.forEach((op) => op());
        return result;
      },
    };

    return {
      fakeDb: db,
      fakeStore: store,
      mockFetchStravaActivity: vi.fn(),
      mockFetchActivityStreams: vi.fn(),
      mockGetValidToken: vi.fn(),
      mockFetchRecentActivities: vi.fn(),
    };
  });

vi.mock("firebase-admin/firestore", () => ({
  FieldValue: { increment: (n: number) => ({ __increment: n }) },
}));

vi.mock("@/lib/firebase/admin", () => ({
  adminDb: () => fakeDb,
}));

vi.mock("@/lib/strava/client", () => ({
  fetchStravaActivity: mockFetchStravaActivity,
  fetchActivityStreams: mockFetchActivityStreams,
  getValidToken: mockGetValidToken,
  fetchRecentActivities: mockFetchRecentActivities,
}));

import {
  syncStravaActivity,
  removeStravaActivity,
  findUidByAthleteId,
} from "@/lib/strava/sync";
import { COLLECTIONS } from "@/lib/firebase/collections";

const UID = "uid-1";
const ATHLETE_ID = 42;
const MAX_HR = 200; // round number -> clean zone boundaries at 120/140/160/180bpm

function seed() {
  fakeStore.clear();
  fakeStore.set(`users/${UID}`, {
    challengeIds: ["ch-goal", "ch-zone"],
    maxHeartRate: MAX_HR,
    strava: {
      athleteId: ATHLETE_ID,
      accessToken: "token-abc",
      refreshToken: "refresh-abc",
      expiresAt: Math.floor(Date.now() / 1000) + 3600,
    },
  });
  fakeStore.set("challenges/ch-goal", {
    scoring: "goal",
    sportType: "Run",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
  fakeStore.set("challenges/ch-zone", {
    scoring: "zone",
    zoneConfig: null,
    startDate: "2026-07-01",
    endDate: "2026-07-31",
  });
  fakeStore.set(`challenges/ch-goal/members/${UID}`, {
    totalDistance: 0,
    totalDuration: 0,
    activityCount: 0,
  });
  fakeStore.set(`challenges/ch-zone/members/${UID}`, {
    totalDistance: 0,
    totalDuration: 0,
    activityCount: 0,
    totalPoints: 0,
    zoneMinutes: { z2: 0, z3: 0, z4: 0, z5: 0 },
  });
}

// 15 min at 130bpm (65% of MAX_HR -> z2), then 5 min at 150bpm (75% -> z3).
// Sampled every 30s (the per-sample gap cap in computeZoneMinutesFromStream)
// so none of it gets capped away — a single 900s gap wouldn't reproduce
// real zone-training minutes any more than it would in production.
const z2Times = Array.from({ length: 30 }, (_, i) => i * 30); // 0..870, 15 min of gaps
const z3Times = Array.from({ length: 11 }, (_, i) => 900 + i * 30); // 900..1200, 5 min of gaps
const z2z3Stream = {
  time: [...z2Times, ...z3Times],
  heartrate: [...Array(30).fill(130), ...Array(11).fill(150)],
};

function baseActivity(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 999,
    name: "Morning Run",
    sport_type: "Run",
    distance: 5000,
    moving_time: 1500,
    elapsed_time: 1600,
    start_date: "2026-07-15T06:00:00Z",
    map: { summary_polyline: null },
    athlete: { id: ATHLETE_ID },
    ...overrides,
  };
}

describe("Strava activity sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetValidToken.mockImplementation(async (tokens) => tokens);
    seed();
  });

  it("syncs a new activity into both a matching goal challenge and a zone challenge", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(z2z3Stream);

    await syncStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.totalDistance).toBe(5000);
    expect(goalMember.totalDuration).toBe(1500);
    expect(goalMember.activityCount).toBe(1);

    const zoneMember = fakeStore.get(`challenges/ch-zone/members/${UID}`);
    expect(zoneMember.zoneMinutes).toEqual({ z2: 15, z3: 5, z4: 0, z5: 0 });
    expect(zoneMember.totalPoints).toBeGreaterThan(0);
    expect(zoneMember.activityCount).toBe(1);
  });

  it("re-syncing with changed data replaces the old entry instead of double-counting", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(null);
    await syncStravaActivity(UID, 999);

    // Activity gets edited (distance corrected) on Strava and re-synced
    mockFetchStravaActivity.mockResolvedValue(baseActivity({ distance: 8000 }));
    await syncStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.totalDistance).toBe(8000); // not 5000 + 8000
    expect(goalMember.activityCount).toBe(1); // not 2

    const activityKeys = [...fakeStore.keys()].filter((k) =>
      k.startsWith(`${COLLECTIONS.activities("ch-goal")}/`)
    );
    expect(activityKeys).toHaveLength(1);
  });

  it("skips the zone challenge entirely when there's no HR data", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(null);

    await syncStravaActivity(UID, 999);

    const zoneMember = fakeStore.get(`challenges/ch-zone/members/${UID}`);
    expect(zoneMember.activityCount).toBe(0);
    expect(zoneMember.zoneMinutes).toEqual({ z2: 0, z3: 0, z4: 0, z5: 0 });
  });

  it("skips the zone challenge, without even fetching streams, when the athlete hasn't set a max heart rate", async () => {
    fakeStore.set(`users/${UID}`, {
      ...fakeStore.get(`users/${UID}`),
      maxHeartRate: null,
    });
    mockFetchStravaActivity.mockResolvedValue(baseActivity());

    await syncStravaActivity(UID, 999);

    expect(mockFetchActivityStreams).not.toHaveBeenCalled();
    const zoneMember = fakeStore.get(`challenges/ch-zone/members/${UID}`);
    expect(zoneMember.activityCount).toBe(0);
  });

  it("a streams-fetch failure degrades to no zone data instead of sinking the goal-challenge sync too", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockRejectedValue(new Error("Strava streams fetch failed: 429"));

    await syncStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.activityCount).toBe(1); // goal sync still went through
    const zoneMember = fakeStore.get(`challenges/ch-zone/members/${UID}`);
    expect(zoneMember.activityCount).toBe(0); // zone sync skipped, not crashed
    expect(consoleError).toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it("removeStravaActivity re-verifies against Strava, then deletes and reverses totals once confirmed gone", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(null);
    await syncStravaActivity(UID, 999);

    // Strava confirms the activity is really gone (404 -> null)
    mockFetchStravaActivity.mockResolvedValue(null);
    await removeStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.totalDistance).toBe(0);
    expect(goalMember.activityCount).toBe(0);

    const activityKeys = [...fakeStore.keys()].filter((k) =>
      k.startsWith(`${COLLECTIONS.activities("ch-goal")}/`)
    );
    expect(activityKeys).toHaveLength(0);
  });

  it("removeStravaActivity ignores a delete claim when Strava still has the activity (forged/incorrect delete event)", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(null);
    await syncStravaActivity(UID, 999);

    // The webhook claims deletion, but re-fetching Strava shows the
    // activity still exists - the claim should be ignored.
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    await removeStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.totalDistance).toBe(5000);
    expect(goalMember.activityCount).toBe(1);

    const activityKeys = [...fakeStore.keys()].filter((k) =>
      k.startsWith(`${COLLECTIONS.activities("ch-goal")}/`)
    );
    expect(activityKeys).toHaveLength(1);
  });

  it("syncStravaActivity cleans up a stale entry when Strava confirms the activity no longer exists", async () => {
    mockFetchStravaActivity.mockResolvedValue(baseActivity());
    mockFetchActivityStreams.mockResolvedValue(null);
    await syncStravaActivity(UID, 999);

    // A create/update event arrives late, after the activity was deleted
    mockFetchStravaActivity.mockResolvedValue(null);
    await syncStravaActivity(UID, 999);

    const goalMember = fakeStore.get(`challenges/ch-goal/members/${UID}`);
    expect(goalMember.totalDistance).toBe(0);
    expect(goalMember.activityCount).toBe(0);
  });

  it("findUidByAthleteId resolves a connected athlete id to its uid", async () => {
    expect(await findUidByAthleteId(ATHLETE_ID)).toBe(UID);
    expect(await findUidByAthleteId(999999)).toBeNull();
  });
});
