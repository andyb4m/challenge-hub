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
- Zone challenges store their rules on `Challenge.zoneConfig` (`DEFAULT_ZONE_CONFIG` in `src/lib/challenges/zone.ts` is just the starting point, pre-filled in the create form). **Creator-editable, both at creation and afterward** — see the `ZoneManageCard`/`ZoneConfigEditor` note below. Model: zone minutes × multipliers (default Z2 ×1.0/Z3 ×0.5/Z4 ×1.5/Z5 ×2.0), Others flat points by ≥30/≥60min tier, Recovery flat points once/calendar-week, a low-intensity bonus band + multiplier. **Two different freezing behaviors, easy to get backwards:** multiplier/Others/Recovery point values are baked into `Activity.points` and `member.totalPoints` at *log time* — editing the config later never rewrites past entries. The bonus, by contrast, is applied *live* in `effectiveZonePoints()` off the challenge doc's current `zoneConfig.bonus` — changing the bonus band/multiplier immediately changes everyone's displayed total, including points earned before the edit.
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
- **A page needing `generateMetadata` can't be `"use client"`.** `/join/[token]` is the first dynamic-metadata page: `page.tsx` is a server component that calls `generateMetadata` (for the invite's Open Graph title/description) and renders a separate `join-content.tsx` client component for the interactive join flow. Follow this split — server `page.tsx` + client child — for any future page that needs both per-instance metadata and client interactivity. Server-side lookups shared between a route handler and `generateMetadata` belong in `src/lib/**/*-server.ts` (see `invite-server.ts`) rather than duplicated.
- **Password reset doesn't leak account existence.** `requestPasswordReset` (`src/lib/auth/service.ts`) swallows Firebase's `auth/user-not-found` so `/forgot-password` shows the same "check your email" outcome whether or not the address has an account. Keep that behavior if this flow changes.
- **Primary nav is a bottom tab bar on mobile, not the header.** `BottomNav` (`src/components/bottom-nav.tsx`) is fixed, `sm:hidden`, three destinations: Challenges / Activity / Profile, active state via `usePathname()` prefix match. `AppShell` (`src/components/app-shell.tsx`, wraps `{children}` in the root layout) owns showing it only when signed in, reserving bottom padding on the content so the fixed bar doesn't cover it, and now also renders `SiteFooter` itself (moved out of `layout.tsx`) so the footer gets the same clearance. The header's `AccountMenu` is now desktop-only (`hidden sm:block` wrapper in `site-header.tsx`) — mobile has no header nav at all, just the wordmark, since the bottom bar covers Challenges/Profile and **Sign out moved to a `SignOutButton` on `/profile`** (the account-actions surface bottom nav can't reach). `/activity` (`src/app/activity/page.tsx`) is a new top-level page mirroring the nav tab — reuses `fetchMyRecentActivities` (already took a `limitCount` param) via a new `useMyActivities` hook, and the existing `RecentActivityCard` for rendering. The `/challenges` hub still shows its own 5-item "Recent activity" teaser with a "See all" link to `/activity`, not removed. The "New challenge" action on `/challenges` is a compact icon-only `Button size="icon"` (new size added to the primitive), not a 4th nav tab — nav destinations are places you return to, creating a challenge is a one-off action, kept as a button. Legal links (`LegalLinks`, `src/components/legal-links.tsx`) are extracted for reuse but rendered in exactly one place, `SiteFooter` — it's already global via `AppShell` (every page, signed in or not, since Impressum has to be reachable before registration under German law), so don't also add it to `/profile` or anywhere else; that produced visible back-to-back duplication on `/profile` the first time (footer + a page-level copy) and was reverted.
- **The `/challenges` hub splits by status, not a flat list.** `splitChallengesForHub()` (`src/lib/challenges/scoring.ts`) partitions into `current` (active + upcoming, shown in full) and `past` (ended, capped to 3 with a "See all" → `/challenges/past` link), both sorted by `startDate` descending. Fixes what was previously an unsorted, ever-growing list — the original bug report was a user whose hub showed only ended challenges in a seemingly random order, because nothing sorted or grouped them.
- **Zone rules are editable via the same two-surface pattern as variety kinds.** `ZoneConfigEditor` (`src/components/challenges/zone-config-editor.tsx`) is the shared form UI, used both in `ChallengeForm` at creation (pre-filled with `DEFAULT_ZONE_CONFIG`, freely editable before submit) and in `ZoneManageCard` (mirrors `VarietyManageCard`'s collapse/expand-to-edit pattern) on the challenge page, creator-only, via `updateZoneConfig()`. Any UI text that states a specific zone number (bonus %, multiplier) must read it from the challenge's actual `zoneConfig`, never hardcode the old defaults — `leaderboard.tsx`'s bonus blurb and star-badge tooltip were computing off a literal `×1.15`/`80/20` string until this shipped; watch for the same mistake in new copy.

---

## Confirmed product decisions (don't re-litigate without asking)

- **Firebase Storage stays disabled.** Photo upload is fully implemented (`uploadProfilePhoto`, `src/lib/auth/service.ts`) but gated behind `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD=true`, which is unset. Enabling requires the Blaze plan — an account change, not a code change.
- ~~Zone challenge rules stay fixed defaults, not creator-editable~~ — **reversed**: Andreas asked for full creator control (multipliers, Others points, the 30/60 split, the bonus band and multiplier), same footing as variety kinds now. See the zone-config note under Data model and the `ZoneManageCard`/`ZoneConfigEditor` components.
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

If you touch this surface again, re-run a security review (candidate-finding pass → independent per-finding verification pass) rather than assuming it's still sound — this is the app's highest-consequence code path (cross-user data writes from unauthenticated input). Concretely: map where untrusted data crosses in (webhook body, OAuth params, form input, third-party API responses) and run a quick STRIDE pass over each boundary (spoofing/tampering/repudiation/disclosure/DoS/privilege-escalation) rather than reasoning about it ad hoc — this is what actually caught the two vulnerabilities above.

**Ask before merging, don't just push:** a new auth flow, a new external integration, a new category of stored personal data, or a `firestore.rules` change. Any new personal-data field needs a stated purpose and, like account deletion already has, a real deletion path — not just a nice-to-have added later.

---

## Tech debt / deferred

- [ ] **`STRAVA_SUBSCRIPTION_ID` not set.** Optional defense-in-depth env var (rejects webhook events with mismatched `subscription_id`). Core security fix above doesn't depend on it. Value: `GET https://www.strava.com/api/v3/push_subscriptions` with `client_id`/`client_secret` query params. Needs setting in both `.env.local` and Netlify.
- [ ] **PWA icons are placeholder art** — hand-generated (gradient + white circle) via a from-scratch PNG encoder since the sandbox has no image tooling. Swap `src/app/icon.png`, `apple-icon.png`, `public/icons/icon-{192,512}.png` for real designed artwork.
- [ ] **PWA not verified on a real device** — "Add to Home Screen" on iOS Safari / Android Chrome untested past local `next build && next start` header/manifest checks.
- [x] ~~Strava's "Authorization Callback Domain" doesn't match the live domain~~ — **fixed** (Andreas updated `strava.com/settings/api` → `fit-challenge-hub.netlify.app`, bare domain). Root-caused via a real friend's failed connect attempt (`{"errors":[{"field":"redirect_uri","code":"invalid"}]}`); had been invisible because Strava always whitelists `localhost`, which is where all prior testing happened. Revisit again if/when a custom domain replaces the Netlify one. Same dashboard's "Website" field still shows the old `runningchallenge.netlify.app` placeholder — cosmetic only, not load-bearing for OAuth, low-priority cleanup whenever convenient.
- [ ] One Datenschutz placeholder: Firestore server region/location (Firebase console → Firestore → location) — needs a console lookup to fill in the EU-transfer clause language. Flagged inline on the page itself.
- [ ] Firestore rules file and the console's published rules can drift — the repo file is source of truth but **publishing is manual**; if behavior doesn't match the repo, check the console copy first.
- [ ] **No formal accessibility audit yet** (color contrast, screen readers, WCAG 2.1 AA) — came up during a redesign conversation but hasn't been started. Don't wait for the audit to do the basics on anything new: native semantic elements over `div`+`onClick`, visible focus states, `aria-label` on icon-only controls (already the convention — see `AccountMenu`, the icon-only "New challenge" button), and keyboard operability (Enter to activate, Escape to close). Retrofitting this later is much more expensive than building it in.

---

## Local environment

Developer is on Windows, VS Code, Node.js v22. Dev server: `npm run dev` → `http://localhost:3000`.

`.env.local` — see `.env.local.example` for the full annotated list (Firebase client + admin, Strava client/server/webhook, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD`). Known gotcha: don't wrap values in quotes — a literal `""project-id""` in `FIREBASE_ADMIN_PROJECT_ID` once passed silently into `verifyIdToken` and broke every Admin-SDK request with an opaque `aud`-mismatch error. On Windows PowerShell, `curl` aliases to `Invoke-WebRequest` (incompatible flags) — use `curl.exe` for real curl, e.g. registering the Strava webhook subscription.

---

## Workflow conventions for this repo

- Verify before every commit: `npx tsc --noEmit`, `npx next lint`, `npx vitest run`, then `rm -rf .next && npx next build && rm -rf .next`.
- One PR per feature/fix. Merge routine/cosmetic PRs promptly; hold for explicit confirmation on anything security- or data-sensitive (see the "ask before merging" list under Security notes).
- Before pushing, self-review the diff on five axes — correctness, readability, architecture, security, performance — not just "it builds and tests pass." Treat ~300 changed lines as the point to consider splitting into more than one PR; a few hundred is fine for one cohesive feature, but don't let unrelated changes ride along.
- When something breaks unexpectedly, stop and root-cause it before moving on to the next thing: reproduce it reliably, localize where it actually happens rather than guessing, fix the root cause, then leave a guard so it can't silently regress (a test, or a CLAUDE.md note like the Strava callback-domain entry above). Resist patching the symptom and moving on — that's how the callback-domain bug went unnoticed for as long as it did.
- After a PR merges, reset the working branch from `main` before starting new work (`git fetch origin main && git checkout -B <branch> origin/main`) rather than layering onto already-merged history.
- Update *this file* in place — condense, don't accumulate. If you're about to add a "Done in session N" block, add the durable fact to the relevant section above instead and let `git log`/the PR carry the narrative.
