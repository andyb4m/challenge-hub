# Challenge Hub — Agent Handover

Read this before writing any code. It's a *reference*, not a changelog — full narrative history lives in `git log`, not here. Keep this file in this shape: update the relevant section in place when something changes; don't append a new dated session block.

## What this project is

A Next.js 14 web platform that lets small friend groups create and compete in fitness challenges, with automatic activity sync from Strava. Audience: ~15 people, soft ceiling of a few hundred. Simplicity and low operational cost are explicit priorities over scalability.

| Concern | Choice |
|---------|--------|
| Framework | Next.js 14, App Router, TypeScript strict |
| Styling | Tailwind CSS + hand-written shadcn-style primitives (`src/components/ui/`) — **no shadcn CLI**, just `clsx` + `tailwind-merge` |
| Auth | Firebase Authentication (email/password + Google) |
| Database | Firestore, project `challenge-hub-4917e` |
| Storage | Firebase Storage — **not enabled**, see Tech debt |
| Hosting | Netlify (`fit-challenge-hub.netlify.app`), native Git integration — **not** the GitHub Actions deploy workflow (that approach was tried, found broken, and removed) |
| Testing | Vitest + React Testing Library, `src/lib/**` only (no component tests — established convention) |
| Activity source | Strava (OAuth + webhook sync); Garmin is a hypothetical future phase, not started |
| State | SWR-style hooks in `src/lib/challenges/hooks.ts` for server state, React Context (`auth-context.tsx`) for auth only |

Design system: dark navy theme (`#0f0f23`/`#16213e`), Inter font via runtime Google Fonts `<link>` (not `next/font`, keeps builds offline-safe), indigo→purple gradient primary buttons. Ported from a legacy app; handoff doc at `docs/legacy-summerfit-handoff.md` — **read it** before touching zone-challenge scoring rules or styling.

**Landing page** (`/`, signed-out) is deliberately minimal, not marketing-style — users arrive via direct invite links from friends, not cold traffic. Signed-in visitors are redirected to `/challenges` (the de facto hub).

---

## Data model (Firestore)

```
users/{uid}                              — User
challenges/{challengeId}                 — Challenge
challenges/{challengeId}/members/{uid}   — ChallengeMember
challenges/{challengeId}/activities/{id} — Activity
```
Full field-level types: `src/types/user.ts`, `challenge.ts`, `activity.ts`. Path helpers: `src/lib/firebase/collections.ts` (`COLLECTIONS.members(challengeId)` etc. — always use these, never hardcode paths).

Key shape notes:
- `User.challengeIds?: string[]` — membership list kept on the user doc specifically to avoid collection-group queries/indexes. Optional; read with `?? []`.
- Invite tokens are a field on the challenge doc (`Challenge.inviteToken`), not a separate collection.
- `Challenge.scoring?: "goal" | "zone" | "variety"` — absent on old docs = `"goal"`. **Always read via `challengeScoring()`** (`src/lib/challenges/scoring.ts`), never the raw field.
- `Activity.source: "strava" | "manual"`, `stravaActivityId: number | null`. Strava-sourced activities are written only by Admin-SDK server code; the rules enforce `source == 'manual'` on client creates.
- Zone challenges freeze their rules at creation into `Challenge.zoneConfig` (`DEFAULT_ZONE_CONFIG` in `src/lib/challenges/zone.ts`) — **not** creator-editable (confirmed decision, see Product decisions below). Model: zone minutes × multipliers (Z2 ×1.0/Z3 ×0.5/Z4 ×1.5/Z5 ×2.0), Others 20/40pt by ≥30/≥60min tier, Recovery 30pt max once/calendar-week, 80/20 low-intensity bonus ×1.15.
- Variety challenges have a creator-editable, per-challenge kind catalog (`Challenge.varietyConfig.kinds: {id, label, maxCount}[]`). Member progress is `kindCounts: Record<string, number>` (not an array — kind ids contain hyphens, which break Firestore dot-paths in `FieldPath` updates). Score = Σ `min(count, maxCount)`.
- All writes are atomic: create challenge = challenge+member+`user.challengeIds` in one batch; join = member+challengeIds+`memberCount` increment; manual activity log/delete = activity doc + member total increments. Strava sync (`reconcileGoalActivity`/`reconcileZoneActivity` in `src/lib/strava/sync.ts`) uses a **Firestore transaction**, not a batch — a plain read-then-batch-write here was a confirmed, fixed race condition (see Security notes).
- Scoring is centralized: one dispatcher (`memberScore`/`rankMembersForChallenge`/`memberProgress`/`formatScore` in `scoring.ts`) drives the single `Leaderboard` component for all three challenge types, so ranking and progress bars can't disagree.

Firestore rules (`firestore.rules`, must be **manually re-published to the console** after any change — code changes alone don't take effect): reads on `challenges/{id}` and its `members`/`activities` subcollections require `isChallengeMember()` (checks `exists()` on the caller's own member doc). No top-level `list` on `challenges`. Non-members preview an invite via `/api/invite/[token]` (Admin SDK), not a client query.

---

## Architecture patterns (load-bearing — don't undo these)

- **Lazy Firebase init, both SDKs.** `src/lib/firebase/client.ts` (`firebaseAuth()`/`firestoreDb()`/`firebaseStorage()`) and `src/lib/firebase/admin.ts` (`adminDb()`/`adminAuth()`) are functions, not module-scope values. Module-scope `getAuth()`/admin init crashes `next build`'s page-data collection with `auth/invalid-api-key` or an Admin SDK equivalent whenever env vars are absent (e.g. Netlify deploy previews, which run without secrets) — this has broken the build twice already from two different files. Any new Firebase-touching module must follow the same pattern.
- **Admin-SDK API routes intentionally bypass Firestore rules.** `/api/invite/[token]`, `/api/account` (DELETE), `/api/strava/{connect,callback,webhook}`. Each verifies the caller's Firebase ID token itself where auth is required (account deletion, strava connect) — server-side specifically to dodge Firebase Auth's client-side "recent login" requirement.
- **Strava sync never trusts webhook body fields.** `object_id`/`owner_id`/`aspect_type` only decide *what* to re-fetch from Strava with our own stored credentials; the re-fetched canonical activity is what actually gets written. This was a deliberate fix for a real forged-event vulnerability (see Security notes) — don't shortcut it back to trusting the payload.
- **`RequireAuth`** (`src/components/auth/require-auth.tsx`) is the client-side page guard; preserves destination via `?next=` (sanitized by `safeNextPath`) so invite links survive login/registration. Its own loading state is deliberately plain text, not a skeleton — it's content-agnostic and runs before any page-specific data exists.
- **Loading states elsewhere are shape-matched skeletons**, not text: `Skeleton` primitive (`src/components/ui/skeleton.tsx`) + page-specific skeleton components alongside each page's real components. Follow this pattern for any new page with an async load.
- **No dropdown/menu/dialog library.** `AccountMenu` (`src/components/account-menu.tsx`, the header's avatar menu) is the first floating-menu pattern in the app — hand-rolled with `useState` + a `pointerdown`/`Escape` document listener for click-outside, absolutely positioned against a `relative` wrapper. Reuse this pattern (not a new dependency) for any future dropdown/popover.
- Google profile photos (`lh3.googleusercontent.com`) require `referrerPolicy="no-referrer"` on every `<img>` that renders one, or they silently 404 (hotlink protection). All current call sites have this; keep it on any new one.

---

## Confirmed product decisions (don't re-litigate without asking)

- **Firebase Storage stays disabled.** Photo upload is fully implemented (`uploadProfilePhoto`, `src/lib/auth/service.ts`) but gated behind `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD=true`, which is unset. Enabling requires the Blaze plan — an account change, not a code change.
- **Zone challenge rules stay fixed defaults**, not creator-editable (unlike variety kinds). Over-engineering for this app's scale unless someone actually asks.
- **Registration stays open** — any email can create an account; only joining a *specific* challenge requires an invite link. Acceptable access model at this scale.
- **Variety challenges stay manual-entry only** (no Strava sync) — no reliable way to map Strava's `sport_type` onto a fully custom, creator-editable kind catalog. Goal and zone challenges do sync from Strava.
- **PWA, not native app store presence.** Installable home-screen web app shipped (manifest, service worker, icons). Capacitor-wrapping for real App Store distribution was discussed and explicitly deferred (Apple review risk for thin WebView wrappers, needs OAuth rework for Google/Strava sign-in).
- Account deletion (`DELETE /api/account`) removes the user's own data (member docs, own activities, `users/{uid}`, Auth account) but does **not** cascade-delete challenges they created — `createdBy` is left pointing at a deleted uid, which means no one can edit/delete that challenge afterward. Accepted tradeoff over touching a shared resource other members still use.

---

## Security notes (context for anything touching Strava sync or webhooks)

Two real vulnerabilities were found and fixed in the Strava webhook surface (`src/lib/strava/sync.ts`, `src/lib/strava/client.ts`):
1. **Webhook forgery**: unauthenticated `POST /api/strava/webhook` (matches Strava's actual protocol — no per-event signature) meant delete/deauth events were trusted outright. Fixed by re-fetching from Strava before acting: `fetchStravaActivity` returns `null` on 404 (not a throw) so "confirmed gone" is distinguishable from a transient error; `removeStravaActivity` only proceeds if the activity is genuinely gone; `syncStravaActivity` self-heals if create/update events arrive for something since-deleted. Optional defense-in-depth: `STRAVA_SUBSCRIPTION_ID` env var check (see Tech debt — not yet set).
2. **Race condition**: concurrent syncs for the same activity could double-count before the fix — reconcile functions now run inside `db.runTransaction`, not a read-then-batch-write.

OAuth `state` param is HMAC-signed with `STRAVA_CLIENT_SECRET` (`signState`/`verifyState` in `src/lib/strava/oauth.ts`) — an earlier unsigned version would have let anyone who knew a member's uid link their own Strava account to that uid.

If you touch this surface again, re-run a security review (candidate-finding pass → independent per-finding verification pass) rather than assuming it's still sound — this is the app's highest-consequence code path (cross-user data writes from unauthenticated input).

---

## Tech debt / deferred

- [ ] **`STRAVA_SUBSCRIPTION_ID` not set.** Optional defense-in-depth env var (rejects webhook events with mismatched `subscription_id`). Core security fix above doesn't depend on it. Value: `GET https://www.strava.com/api/v3/push_subscriptions` with `client_id`/`client_secret` query params. Needs setting in both `.env.local` and Netlify.
- [ ] **PWA icons are placeholder art** — hand-generated (gradient + white circle) via a from-scratch PNG encoder since the sandbox has no image tooling. Swap `src/app/icon.png`, `apple-icon.png`, `public/icons/icon-{192,512}.png` for real designed artwork.
- [ ] **PWA not verified on a real device** — "Add to Home Screen" on iOS Safari / Android Chrome untested past local `next build && next start` header/manifest checks.
- [ ] Custom domain + updating Strava's Authorization Callback Domain (still points at a legacy placeholder) — not blocking, whenever wanted.
- [ ] One Datenschutz placeholder: Firestore server region/location (Firebase console → Firestore → location) — needs a console lookup to fill in the EU-transfer clause language. Flagged inline on the page itself.
- [ ] Firestore rules file and the console's published rules can drift — the repo file is source of truth but **publishing is manual**; if behavior doesn't match the repo, check the console copy first.

---

## Local environment

Developer is on Windows, VS Code, Node.js v22. Dev server: `npm run dev` → `http://localhost:3000`.

`.env.local` — see `.env.local.example` for the full annotated list (Firebase client + admin, Strava client/server/webhook, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD`). Known gotcha: don't wrap values in quotes — a literal `""project-id""` in `FIREBASE_ADMIN_PROJECT_ID` once passed silently into `verifyIdToken` and broke every Admin-SDK request with an opaque `aud`-mismatch error. On Windows PowerShell, `curl` aliases to `Invoke-WebRequest` (incompatible flags) — use `curl.exe` for real curl, e.g. registering the Strava webhook subscription.

---

## Workflow conventions for this repo

- Verify before every commit: `npx tsc --noEmit`, `npx next lint`, `npx vitest run`, then `rm -rf .next && npx next build && rm -rf .next`.
- One PR per feature/fix. Merge routine/cosmetic PRs promptly; hold for explicit confirmation on anything security- or data-sensitive.
- After a PR merges, reset the working branch from `main` before starting new work (`git fetch origin main && git checkout -B <branch> origin/main`) rather than layering onto already-merged history.
- Update *this file* in place — condense, don't accumulate. If you're about to add a "Done in session N" block, add the durable fact to the relevant section above instead and let `git log`/the PR carry the narrative.
