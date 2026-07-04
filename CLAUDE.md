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

**Session-4 judgment calls for Andreas to review (also listed in the PR):** zone rules not editable in UI (SummerFit defaults, frozen per challenge); zone time entry = plain minute inputs, not legacy h:m:s segments; 80/20 bonus computed at render from stored member totals (no server functions yet); weekly recovery limit enforced client-side only; variety duplicates allowed but score only up to the kind's limit; zone progress bars relative to leader; cumulative points chart deferred.

### Done in session 5 (Andreas's morning request)
- [x] **Variety catalog is now per-challenge and creator-editable** (`Challenge.varietyConfig.kinds: {id, label, maxCount}[]`): rename/add/remove kinds and set how often each counts (×N), both in the create form and afterwards via a creator-only "Edit activities" card on the challenge page (`VarietyManageCard`; plain challenge-doc update, allowed by existing rules)
- [x] Member model changed `kinds: string[]` → `kindCounts: Record<string, number>` (increments via `FieldPath` — kind ids contain hyphens, dot-paths reject them). Score = Σ min(count, maxCount); removed kinds score 0; lowered maxCount clamps retroactively. **Any variety challenge created from the branch before this change must be deleted/recreated** (nothing merged affected)
- [x] Emoji folded into kind labels (single editable string); custom kinds get slugified ids (`makeKindId`)
- [x] Collection card + log form show per-kind counted/max; leaderboard shows `score/maxScore`
- [x] Tests: 124 passing

### Done in session 7 (items 2 and 6 from the session-6 roadmap)
- [x] **Firestore rules gap closed** (item 2): `challenges/{challengeId}`, its `members/{uid}` subcollection, and its `activities/{activityId}` subcollection now require the requester to already be a member (`isChallengeMember()` rule function, checks `exists()` on their own member doc) — no more any-signed-in-user reads. `allow list` on the top-level `challenges` collection is now `false` (no client query needs it any more, see next point). Also deleted the dead `invites/{inviteToken}` rules block — that collection was never written or read; invite tokens live as a field on the challenge doc (`Challenge.inviteToken`, queried directly). **Must be re-published to the console, same as prior sessions' rules changes.**
- [x] **New: `/api/invite/[token]` route** (first API route in the repo, Admin SDK) — the join-by-invite-link flow (`/join/[token]`) needs a *non-member* to preview a challenge before they've joined, which the tightened rules above now forbid client-side. `findChallengeByToken` in `service.ts` now calls this route instead of querying Firestore directly; the route returns the full challenge doc (nothing in it is "workout stats" — the sensitive data being protected lives in members/activities, which stay locked down).
- [x] **Found and fixed a latent bug while adding that route**: `src/lib/firebase/admin.ts` initialized `adminDb`/`adminAuth` at module scope, exactly the bug already fixed once for the client SDK (see session 2 notes) — `next build` page-data collection now crashes on any route that imports it when `FIREBASE_ADMIN_*` env vars are absent (confirmed locally: reproduced the crash, then fixed it). Converted to the same lazy-init pattern as `client.ts`: `adminDb()`/`adminAuth()` are now functions, not values. This would have broken the Netlify deploy-preview build (which already runs without secrets, per the tech debt item below) the moment any admin-SDK route shipped — worth having caught before Strava integration adds the webhook route.
- [x] **Zone leaderboard Z2–Z5 + activity-count columns** (item 6, part 1): each member row on the zone leaderboard now shows a compact stats line (activity count + Z2/Z3/Z4/Z5 minutes) under their progress bar. Kept it inline with the existing card-list leaderboard rather than switching to a literal legacy-style `<table>`, to stay consistent with the app's established mobile-first card design (item 4, mobile walkthrough, is still unverified — a horizontal-scrolling table felt like the wrong bet ahead of that).
- [x] **Cumulative points chart** (item 6, part 2): hand-rolled SVG line chart (`ProgressChart`, `src/components/challenges/progress-chart.tsx`) — went with Andreas's leaning from the session-6 notes since it wasn't flagged as re-opened. Pure data-shaping in `src/lib/challenges/progress-chart.ts` (`buildZoneProgressChart`, tested): x-axis is the distinct days any zone activity was logged (sparse, not every calendar day), y is cumulative raw `points` per member — the 80/20 bonus is intentionally **not** applied per-day (it's only meaningful on final totals, see `effectiveZonePoints`), so the chart tracks raw point accumulation. Legacy summer color palette ported for the per-member lines.
- [x] Tests: 130 passing (+ new `progress-chart.test.ts`, `invite.test.ts` integration test for the new route)
- [x] **Legal pages (item 1)**: `/impressum` and `/datenschutz`, plus a `SiteFooter` linking to both from every page (root layout). Content drafted from Andreas's supplied name/address/email; **Andreas confirmed the Data Processing Addendum with Google Cloud is accepted**, noted as such in the Datenschutz text. One placeholder left deliberately unfilled — flagged inline on the page itself, not just here — because it needs a console lookup, not legal judgment: the Firestore database's server region/location (Firebase console → Firestore → location), which determines whether an EU-transfer clause is needed. **This is drafted text, not reviewed by a lawyer** — same caveat as always with legal content from an agent.
- [x] **Not done — needs a browser to verify**: superseded — Andreas pulled the branch and tested locally in session 8 (see below), so items 1 and 6 are now browser-verified against live data, not just build/lint/tests.

### Done in session 8 (Andreas's local testing feedback, same branch/PR)
- [x] **Fixed broken Google profile photos**: `<img src={photoURL}>` was missing `referrerPolicy="no-referrer"`. Google's `lh3.googleusercontent.com` photo URLs enforce hotlink protection based on the Referer header and will silently fail (broken-image icon) without it — a well-known gotcha, not something in our own data model. Fixed in all three places a profile photo renders: `site-header.tsx`, `leaderboard.tsx`, `profile-form.tsx`, and the new `hub-header.tsx` below.
- [x] **Back navigation on the challenge page** (`/challenges/[id]`): "← Challenges" link back to the overview, above the title.
- [x] **Signed-in home now redirects to `/challenges`**: `/` checks auth state and `router.replace("/challenges")` once resolved, instead of always showing the marketing landing (which is still what signed-out visitors see, unchanged — see the "Landing page" design note below).
- [x] **`/challenges` is now the de facto signed-in hub**, per Andreas's ask: a `HubHeader` card at the top shows the user's photo/name, then 3 KPIs in a row (active challenges, total challenges, total activities), then a divider, then a "Latest activity" section (name/date/which challenge) — redesigned mid-session to match a reference layout Andreas shared, rather than the initial single-row photo+stats version. Backed by two `service.ts` fetchers (`fetchMyActivityCount` sums each challenge's `members/{uid}.activityCount`; `fetchMyLastActivity` scans each challenge's activity feed client-side rather than a `where(uid==).orderBy(startDate)` query, since that combination needs a composite index this project doesn't define) and a `useMyOverview` hook.
- [x] **Fixed a HubHeader layout bug found in testing**: stat numbers rendered flush against (and visually over) the card's top edge. Root cause: `CardContent` ships `p-6 pt-0` (designed to pair with a `CardHeader` above it, which supplies the top padding) — `HubHeader` used `CardContent` standalone. Fixed by dropping `CardContent` for a plain padded `div`, plus `overflow-hidden` on the `Card` and `whitespace-nowrap` on stat labels as belt-and-suspenders so nothing can visually escape the rounded corners regardless of content height.
- [x] Tests: still 130 passing — this batch was UI/data-fetching glue with no new pure logic to unit-test, consistent with the project's existing convention (only `src/lib/**` gets dedicated tests, not components).
- [x] **Browser-verified by Andreas** on his machine — photo fix, back link, and hub header (3-KPI layout) all confirmed working.

### Tech debt / deferred (update this list whenever Andreas says "skip for now")
- [ ] **Firebase Storage not enabled** — new Firebase projects require the Blaze plan for Storage. Profile photo upload is fully implemented (`uploadProfilePhoto` in `src/lib/auth/service.ts`) but hidden behind `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD=true`. To re-enable: upgrade plan → enable Storage → publish Storage rules (allow `users/{uid}/{file}` write for owner) → set the flag. Note: Storage SDK retries failing uploads for minutes before rejecting, which looked like a hang in testing.

### Not started yet — agreed order (session 6 brainstorm, see below)
1. [x] **Legal pages: Impressum + Datenschutzerklärung** — done in session 7, see above. Drafted content, not lawyer-reviewed; one open placeholder (Firestore server region) flagged on the page itself.
2. [x] **Firestore rules gap** — closed in session 7, see above. **Still needs the updated `firestore.rules` published to the console** — code changes alone don't take effect until that happens.
3. [ ] **Real domain + Netlify production site** — in progress, session 9. **Found and removed a latent bug**: the old `deploy-preview.yml` (added early, never actually exercised — `NETLIFY_AUTH_TOKEN` was never set) built the app in GitHub Actions and uploaded the raw `.next` folder to Netlify's deploy API via `nwtgck/actions-netlify`. That bypasses Netlify's own build process entirely, and `@netlify/plugin-nextjs` — the piece that wires API routes and dynamic pages into Netlify Functions — only runs *during* Netlify's own build. Uploading a pre-built folder from outside that pipeline would very likely have shipped a "successful" deploy where `/api/invite/[token]`, `/challenges/[id]`, and `/join/[token]` all 404'd in production, undetected until someone actually clicked through. Deleted that workflow. **Decision: switch to Netlify's native Git integration** (Netlify builds the app itself from the GitHub repo, on every push and PR) instead of patching the GitHub-Actions-upload approach — standard, well-supported path for Next.js on Netlify, and it also means secrets live in one place (Netlify's env vars) instead of split across GitHub secrets and Netlify. `ci.yml` (lint/type-check/test) stays as-is as an independent PR gate; it doesn't touch deployment. **Console-side setup (Andreas, not automatable from here)**:
   - Netlify dashboard → Add new site → Import an existing project → connect GitHub → select `andyb4m/challenge-hub`. It auto-detects `netlify.toml` (build command, publish dir, plugin already configured); confirm production branch = `main`.
   - Site settings → Environment variables → add all keys from `.env.local.example` with real values (the `challenge-hub-4917e` project's Firebase client + admin keys; Strava keys can wait until item 7). Set `NEXT_PUBLIC_BASE_URL` to the site's final URL (Netlify subdomain or custom domain once added).
   - Netlify gives PR deploy previews and production deploys on push to `main` automatically — no GitHub Actions secrets needed for deploy.
   - Optional: Site settings → Domain management → add a custom domain (Netlify handles HTTPS automatically).
   - Once the final production domain is decided, update it in the Strava app's Authorization Callback Domain setting too (currently pointed at the placeholder `runningchallenge.netlify.app` — see item 7).
4. [ ] **Mobile phone walkthrough** — layout is responsive throughout (Tailwind, stacked forms) and believed fine, but not verified on a real device yet.
5. [ ] **Account deletion (GDPR right to erasure)** — no delete-account flow exists yet; needed before real users' PII sits in the DB long-term.
6. [x] Feature work: zone leaderboard Z2–Z5 + activity-count columns, and the cumulative points chart (hand-rolled SVG) — both done in session 7, see above. Not yet browser-verified (sandbox had no Firebase credentials) — please check both on a real challenge.
7. [ ] `feature/strava-integration` — OAuth callback, webhook handler, activity backfill; must set `source: "strava"` on synced activities and update the same member totals the manual flow does. **Session-6 decision to wait for a real domain has been overtaken**: Andreas registered the Strava API app (session 7) using the legacy `runningchallenge.netlify.app` site as the Website/Authorization Callback Domain, plus `localhost` for local dev, rather than waiting on item 3. Still not started — this is next up whenever Andreas wants it, no longer blocked.
- [x] Strava API credentials — Andreas has a Client Secret, Access Token, and Refresh Token from the Strava app dashboard (session 7); **Client ID still needed**. ⚠️ These were pasted into a chat session, not committed anywhere — they must go into `.env.local` on Andreas's own machine (untracked, see `.env.local.example` for the expected keys), never into a repo file. Given they touched a chat transcript, consider regenerating the Client Secret before relying on it long-term.

**Landing page**: deliberately NOT planned as a marketing-style page (hero/steps/stats/testimonials like the legacy site) — users arrive via direct invite links from friends, not cold traffic, so that investment doesn't pay off here. Keep it minimal; put polish into challenge/leaderboard pages instead. Profile section deemed secondary/sufficient as-is, aside from the account-deletion item above.

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
