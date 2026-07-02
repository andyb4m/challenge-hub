# Challenge Hub — Agent Handover

Read this before writing any code. It is the ground truth for the current state of the project.

## What this project is

A Next.js 14 web platform that lets small friend groups create and compete in fitness challenges, with automatic activity sync from Strava. Initial audience: ~15 people, soft ceiling of a few hundred. Simplicity and low operational cost are explicit priorities.

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14, App Router, TypeScript strict |
| Styling | Tailwind CSS + shadcn/ui |
| Auth | Firebase Authentication (email/password + Google) |
| Database | Firestore (fresh project — no migration needed) |
| Storage | Firebase Storage (profile photos only) |
| Hosting | Netlify via `@netlify/plugin-nextjs` |
| CI/CD | GitHub Actions |
| Testing | Vitest + React Testing Library |
| Activity source | Strava only (Garmin is Phase 2) |
| State | SWR for server state, React Context for auth only |

---

## Current state (end of session 1)

### Done
- [x] Repo created: `github.com/andyb4m/challenge-hub`
- [x] Full project scaffold on `main`: package.json, tsconfig.json, next.config.mjs, Tailwind, Netlify, CI/CD workflows, Firestore rules, .env.local.example
- [x] Shared TypeScript types in `src/types/`: User, StravaConnection, Challenge, ChallengeMember, Activity, StravaWebhookEvent
- [x] Firebase lib stubs: `src/lib/firebase/client.ts`, `admin.ts`, `collections.ts`
- [x] Strava lib stubs: `src/lib/strava/client.ts`, `oauth.ts`, `webhook.ts`
- [x] Minimal app scaffold: `src/app/layout.tsx`, `page.tsx`, `globals.css`
- [x] Critical-path tests: webhook sig (4 passing), scoring (4 passing), invite tokens (3 passing)
- [x] Dev server running locally on Windows at localhost:3000

### Done in session 2 (branch `claude/challenge-hub-auth-users-9sht9o`)
- [x] Auth & users feature: `/login`, `/register` (email/password + Google popup), `/profile` (edit display name, upload photo to Storage, Strava connect/disconnect UI)
- [x] `AuthProvider` context (`src/lib/auth/auth-context.tsx`): Firebase auth state + live `users/{uid}` profile via `onSnapshot`; user doc auto-created on first sign-in (`ensureUserDocument`, idempotent)
- [x] Auth lib: `src/lib/auth/service.ts` (all Firebase auth/Firestore/Storage calls), `validation.ts` (zod schemas), `user-doc.ts` (pure `buildNewUser` mapping)
- [x] UI primitives hand-written in shadcn style (`src/components/ui/`: button, input, label, card) with `cn()` util — deliberately did NOT run shadcn CLI init; added deps `clsx` + `tailwind-merge` only
- [x] Site header with auth state in root layout; `RequireAuth` client-side guard for protected pages
- [x] Tests: validation schemas (9) + user-doc mapping (4); full suite 24 passing
- [x] Added missing `.eslintrc.json` (`next/core-web-vitals`) — `next lint` previously prompted interactively, which would have hung CI
- [x] PR #1 opened; CI test job green
- [x] **Switched Firebase project**: old `runningchallenge-6c1f8` abandoned (it had legacy collections from earlier experiments — not a fresh project). New project: **`challenge-hub-4917e`**, clean Firestore default database. Email/password + Google providers enabled, `firestore.rules` published.
- [x] Manual verification on localhost: email register/login, Google sign-in, live profile updates all working
- [x] Firebase client (`src/lib/firebase/client.ts`) converted to lazy init (`firebaseAuth()`, `firestoreDb()`, `firebaseStorage()` functions) — module-scope `getAuth()` crashed `next build` prerendering with `auth/invalid-api-key` when Firebase env vars were absent (broke the deploy-preview workflow)

### Done in session 3 (branch `claude/challenge-hub-auth-users-9sht9o`, restarted from main after PR #1 merged)
- [x] Challenges core: `/challenges` (my list), `/challenges/new` (create form), `/challenges/[id]` (leaderboard + activity feed + log form), `/join/[token]` (invite landing)
- [x] **Design decisions (Andreas)**: one *reusable* invite link per challenge (the single-use `usedBy` model from session 1 is dead); manual activity entry included so the app works before Strava integration
- [x] Data model: `User.challengeIds` (membership list on user doc — avoids collection-group queries/indexes), `Activity.source: "strava" | "manual"` with nullable `stravaActivityId`
- [x] All writes batched atomically: create = challenge + member + user.challengeIds; join = member + challengeIds + memberCount increment; log/delete manual activity = activity doc + member total increments. Scoring is one pure function (`memberTotalInUnit`) so leaderboard order and goal progress can't disagree
- [x] Auth redirect flow: `RequireAuth` preserves destination via `?next=` (sanitized by `safeNextPath`) so invite links survive login/registration
- [x] **firestore.rules changed** — must be re-published to the console: manual activity create/delete by owner, memberCount-only challenge updates by joiners
- [x] Tests: 66 passing (invite eligibility, scoring/ranking per goal unit, doc builders, validation, redirect sanitizer); session-1 sketch tests replaced with real implementations
- [x] **Design system ported from the legacy `running-challenge` app** (Andreas provided a handoff doc, preserved at `docs/legacy-summerfit-handoff.md` — READ IT before styling anything or building hybrid challenges). Dark navy theme (`#0f0f23`/`#16213e` cards), Inter font (runtime Google Fonts link, NOT next/font — keeps builds offline-safe), indigo→purple gradient primary buttons with glow hover, tinted `color/10` status badges/banners, palette lives in `tailwind.config.ts`. Per-challenge accent theming (the legacy token-override mechanism) is deliberately not implemented yet.

### Done in session 4 (overnight autonomous session, same branch/PR #2)
- [x] **Three challenge formats** via `Challenge.scoring: "goal" | "zone" | "variety"` (absent field = `"goal"` for pre-existing docs; always read via `challengeScoring()`)
- [x] **Zone (points) challenges** — the SummerFit model from `docs/legacy-summerfit-handoff.md` §3: zone minutes × multipliers (Z2 ×1.0 / Z3 ×0.5 / Z4 ×1.5 / Z5 ×2.0), Others 20/40 pts by ≥30/≥60-min tier, Recovery 30 pts max once per calendar week (Mon–Sun), 80/20 low-intensity bonus ×1.15 (70–85% band, low = Z2 + 30 min/recovery, high = Z4+Z5, Z3/Others excluded). Rules frozen per-challenge in `Challenge.zoneConfig` at creation (`DEFAULT_ZONE_CONFIG` in `src/lib/challenges/zone.ts`)
- [x] **Variety challenges** (Andreas's idea) — most *different* activity kinds in the window, each counts once; 29-kind catalog translated from his German list (`VARIETY_KINDS` in `src/lib/challenges/variety.ts`); `member.kinds` maintained via `arrayUnion`/conditional `arrayRemove`
- [x] Unified scoring dispatcher (`memberScore`/`rankMembersForChallenge`/`memberProgress`/`formatScore` in scoring.ts) drives the one Leaderboard component for all three kinds; ⭐ +15% badge when the 80/20 bonus is active
- [x] Create form got a challenge-type pill selector with per-type rule explainers; per-type log forms (zone entry pills + live points preview, variety kind picker with "already counted ✓" hints)
- [x] Tests: 116 passing (zone points/bonus/week-limit, variety catalog/score/last-of-kind, cross-kind ranking, schema unions)
- [x] No firestore.rules changes needed (zone/variety entries are `source: "manual"` under the same activity rules)

**Session-4 judgment calls for Andreas to review (also listed in the PR):** zone rules not editable in UI (SummerFit defaults, frozen per challenge); zone time entry = plain minute inputs, not legacy h:m:s segments; 80/20 bonus computed at render from stored member totals (no server functions yet); weekly recovery limit enforced client-side only; variety catalog fixed in code, no free-text kind; variety duplicates allowed but score once; zone progress bars relative to leader; zone/variety analytics table + cumulative points chart deferred.

### Tech debt / deferred (update this list whenever Andreas says "skip for now")
- [ ] **Firebase Storage not enabled** — new Firebase projects require the Blaze plan for Storage. Profile photo upload is fully implemented (`uploadProfilePhoto` in `src/lib/auth/service.ts`) but hidden behind `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD=true`. To re-enable: upgrade plan → enable Storage → publish Storage rules (allow `users/{uid}/{file}` write for owner) → set the flag. Note: Storage SDK retries failing uploads for minutes before rejecting, which looked like a hang in testing.
- [ ] **Netlify deploy preview not configured** — the Deploy Preview workflow builds the app but skips the deploy step while `NETLIFY_AUTH_TOKEN` secret is absent. To enable: create Netlify site, add `NETLIFY_AUTH_TOKEN` + `NETLIFY_SITE_ID` repo secrets, plus `NEXT_PUBLIC_FIREBASE_*` secrets with the **new** (`challenge-hub-4917e`) project values.

### Not started yet
- [ ] `feature/strava-integration` — OAuth callback, webhook handler, activity backfill; must set `source: "strava"` on synced activities and update the same member totals the manual flow does
- [ ] **Hybrid (points-based) challenges** — the group's favourite format, per the legacy SummerFit 2026 challenge (`docs/legacy-summerfit-handoff.md` §3): HR-zone minutes × multipliers + flat-point activity types (with weekly rate limits) + the 80/20 low-intensity ×1.15 bonus. Needs a second challenge kind (`scoring: "goal" | "points"`) — design this BEFORE Strava integration hardens the single-sport/goal assumption. Legacy lessons already baked in: canonical server-side scoring, per-challenge collections never repurposed; still open: server-side date-window enforcement.
- [ ] Firebase Auth providers enabled in Firebase console (email/password + Google)
- [ ] Strava API credentials (deferred — not available during session 1)

---

## Local environment

Developer is on **Windows**, VS Code, Node.js v22. Dev server at `http://localhost:3000`.

`.env.local` status:
- `NEXT_PUBLIC_FIREBASE_*` — filled in (project: `challenge-hub-4917e`; the old `runningchallenge-6c1f8` values are dead)
- `FIREBASE_ADMIN_*` — filled in (service account key generated for `challenge-hub-4917e`)
- Strava values — **left blank**, fill in when credentials are available
- `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD` — leave unset (see tech debt: Storage not enabled)

---

## Firestore schema
