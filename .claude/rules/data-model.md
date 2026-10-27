---
paths:
  - "src/lib/**"
  - "src/types/**"
  - "src/app/api/**"
  - "firestore.rules"
  - "tests/**"
---

# Firestore data model

```
users/{uid}                              — User
challenges/{challengeId}                 — Challenge
challenges/{challengeId}/members/{uid}   — ChallengeMember
challenges/{challengeId}/activities/{id} — Activity
```

Field-level types: `src/types/user.ts`, `challenge.ts`, `activity.ts`. Path helpers: `src/lib/firebase/collections.ts` (`COLLECTIONS.members(challengeId)` etc.) — always use these.

## Shape notes

- `User.challengeIds?: string[]` exists specifically to avoid collection-group queries and indexes. Optional; read with `?? []`.
- Invite tokens are a field on the challenge doc (`Challenge.inviteToken`), not a separate collection.
- `Challenge.scoring?: "goal" | "zone" | "variety"` — read via `challengeScoring()` (`src/lib/challenges/scoring.ts`).
- `Activity.source: "strava" | "manual"`, `stravaActivityId: number | null`. Strava-sourced activities are written only by Admin-SDK server code; rules enforce `source == 'manual'` on client creates.
- **Deletes are not source-restricted.** A member can delete any of their own activities via `deleteActivity()` (`src/lib/challenges/service.ts`), Strava-synced included. This doesn't touch Strava: if a later webhook event touches that activity, `syncStravaActivity`'s self-healing recreates it. No tombstones — accepted tradeoff for a ~15-person app, documented in the function's doc comment.
- `User.maxHeartRate?: number | null` — self-reported on `/profile`, bpm. Required for Strava zone-training sync (see Zone challenges below); unset or null skips it entirely, same as "no HR monitor."

## Zone challenges

Rules live on `Challenge.zoneConfig`. `DEFAULT_ZONE_CONFIG` (`src/lib/challenges/zone.ts`) is only the pre-filled starting point; creators edit at creation and afterward. Model: zone minutes × multipliers (default Z2 ×1.0 / Z3 ×0.5 / Z4 ×1.5 / Z5 ×2.0), "Others" flat points by ≥30 / ≥60 min tier, Recovery flat points once per calendar week, plus a low-intensity bonus band and multiplier.

**Two freezing behaviors — easy to get backwards:**
- Multiplier / Others / Recovery values are baked into `Activity.points` and `member.totalPoints` **at log time**. Editing the config never rewrites past entries.
- The bonus is applied **live** in `effectiveZonePoints()` from the current `zoneConfig.bonus`. Changing it immediately changes everyone's displayed total, including points earned before the edit.

**Strava zone-training sync computes zone minutes itself, from the raw heart-rate stream** (`computeZoneMinutesFromStream`, `src/lib/strava/zones.ts`) — it does **not** use Strava's `/activities/{id}/zones` endpoint. That endpoint reflects whatever zone boundaries Strava has on file (the athlete's custom Strava zones, or Strava's own default), which aren't guaranteed to match the classic %-of-max-HR model this app and Garmin use, and it requires a Strava Summit subscription, which would otherwise silently break sync for any non-Summit athlete (the old code didn't handle a non-404 error there — it threw, uncaught, all the way out of the webhook handler). Instead, `fetchActivityStreams` (`src/lib/strava/client.ts`) pulls the raw `time`/`heartrate` streams and `computeZoneMinutesFromStream` buckets each sample against the athlete's own `User.maxHeartRate` (Z2 60–70% / Z3 70–80% / Z4 80–90% / Z5 90–100%+, Z1 and below dropped — same convention as the rest of this model having no Z1). No `maxHeartRate` set = zone sync skipped for that athlete, not guessed. Past Strava-synced activities aren't retroactively recomputed if someone sets or changes their max HR later — only future syncs use it.

## Variety challenges

Creator-editable catalog `Challenge.varietyConfig.kinds: {id, label, maxCount}[]`. Member progress is `kindCounts: Record<string, number>` — a map, not an array, because kind ids contain hyphens, which break Firestore dot-paths in `FieldPath` updates. Score = Σ `min(count, maxCount)`.

## Writes

All writes are atomic:
- create challenge = challenge + member + `user.challengeIds` in one batch
- join = member + `challengeIds` + `memberCount` increment
- manual activity log/delete = activity doc + member total increments
- Strava sync (`reconcileGoalActivity` / `reconcileZoneActivity` in `src/lib/strava/sync.ts`) uses `db.runTransaction`, not a batch — the read-then-batch version was a confirmed, fixed race condition.

## Scoring

One dispatcher in `scoring.ts` (`memberScore` / `rankMembersForChallenge` / `memberProgress` / `formatScore`) drives the single `Leaderboard` component for all three challenge types, so ranking and progress bars can't disagree. Add new challenge types to the dispatcher, never as a parallel code path.

`splitChallengesForHub()` (also `scoring.ts`) partitions the `/challenges` hub into `current` (active + upcoming, shown in full) and `past` (ended, capped to 3 with a "See all" link to `/challenges/past`), both sorted by `startDate` descending. It fixes a real bug where the hub showed only ended challenges in random order.

## Firestore rules

`firestore.rules` is the source of truth, but **publishing to the console is manual** — code changes alone don't take effect, and the two can drift. If behavior doesn't match the repo, check the console copy first.

Reads on `challenges/{id}` and its `members` / `activities` subcollections require `isChallengeMember()` (an `exists()` check on the caller's own member doc). No top-level `list` on `challenges`. Non-members preview an invite via `/api/invite/[token]` (Admin SDK), not a client query.

## Admin-SDK routes bypass rules on purpose

`/api/invite/[token]`, `/api/account` (DELETE), `/api/strava/{connect,callback,webhook}`, `/api/admin/**`. Where auth is required, each route verifies the caller's Firebase ID token itself — done server-side specifically to avoid Firebase Auth's client-side "recent login" requirement. Server lookups shared between a route handler and `generateMetadata` go in `src/lib/**/*-server.ts` (see `invite-server.ts`), not duplicated.

## Auth service

`requestPasswordReset` (`src/lib/auth/service.ts`) swallows `auth/user-not-found` so `/forgot-password` never reveals whether an account exists. Keep that if the flow changes.
