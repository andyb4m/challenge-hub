# Challenge Hub

Next.js 14 platform where small friend groups create and compete in fitness challenges, with activity sync from Strava. ~15 users, soft ceiling a few hundred. **Simplicity and low operating cost beat scalability** — prefer the boring solution.

This file is a reference, not a changelog. Update sections in place; history lives in `git log` and PRs. Area-specific detail lives in `.claude/rules/` and loads automatically when you work on matching files:

| Rule file | Loads for |
|---|---|
| `data-model.md` | `src/lib/**`, `src/types/**`, `src/app/api/**`, `firestore.rules` |
| `strava-security.md` | Strava code, webhooks, OAuth, their tests |
| `ui-conventions.md` | `src/components/**`, `src/app/**/*.tsx` |
| `admin.md` | `/admin` pages, admin API routes, `src/lib/admin/**` |

Open items: `docs/tech-debt.md`. Legacy design + zone-scoring origin: `docs/legacy-summerfit-handoff.md` (read before changing zone scoring or styling).

## Stack

| Concern | Choice |
|---|---|
| Framework | Next.js 14 App Router, TypeScript strict |
| Styling | Tailwind + hand-written shadcn-style primitives in `src/components/ui/` (**no shadcn CLI**, just `clsx` + `tailwind-merge`) |
| Auth / DB | Firebase Auth (email/password + Google), Firestore project `challenge-hub-4917e` |
| Storage | Firebase Storage **disabled** (see decisions) |
| Hosting | Netlify native Git integration (`fit-challenge-hub.netlify.app`) — **not** a GitHub Actions deploy (tried, broken, removed) |
| Tests | Vitest + RTL, `src/lib/**` only — no component tests, by convention |
| Activity source | Strava OAuth + webhook. Garmin is hypothetical, not started |
| State | SWR-style hooks in `src/lib/challenges/hooks.ts`; React Context only for auth |
| Design review | Vendored `impeccable` skill (`.claude/skills/impeccable/`, pinned, no hooks — see its `UPSTREAM.md`). Advisory only: this file and `ui-conventions.md` win where they conflict |

## Load-bearing rules (apply everywhere)

- **Lazy Firebase init.** Client (`src/lib/firebase/client.ts`: `firebaseAuth()` / `firestoreDb()` / `firebaseStorage()`) and admin (`src/lib/firebase/admin.ts`: `adminDb()` / `adminAuth()`) SDKs are exposed as functions, never module-scope values. Module-scope init breaks `next build` when env vars are absent (Netlify previews) — this has happened twice. Every new Firebase-touching module follows the pattern.
- **Firestore paths only via `COLLECTIONS`** (`src/lib/firebase/collections.ts`). Never hardcode paths.
- **Scoring type only via `challengeScoring()`**, never the raw `Challenge.scoring` field (absent on old docs = `"goal"`).
- **Writes are atomic** (batch or transaction). Strava reconcile uses a transaction — a read-then-batch here was a real race condition.
- **Never trust webhook payloads.** Strava events only decide *what* to re-fetch with our own credentials.
- **`firestore.rules` changes don't deploy with code** — they must be manually republished in the Firebase console.
- **No new UI dependency for menus/dialogs/popovers** — reuse the hand-rolled `AccountMenu` pattern.

## Confirmed product decisions (don't re-litigate without asking)

- Firebase Storage stays off. Photo upload exists (`uploadProfilePhoto`, `src/lib/auth/service.ts`) but is gated behind `NEXT_PUBLIC_ENABLE_PHOTO_UPLOAD=true` (unset); enabling needs the Blaze plan — an account change, not code.
- Zone rules **are** creator-editable (reversed an earlier "fixed defaults" decision), same footing as variety kinds.
- Registration stays open; only joining a specific challenge needs an invite link.
- Variety challenges are manual-entry only — Strava `sport_type` can't map onto a custom kind catalog. Goal and zone challenges sync.
- PWA, not app stores. Capacitor wrapping deferred (Apple review risk, OAuth rework).
- Account deletion removes the user's own data but does not cascade-delete challenges they created (`createdBy` is left dangling). Accepted tradeoff.
- Landing page (`/`) stays minimal, not marketing — users arrive via invite links. Signed-in users redirect to `/challenges`.

## Ask before merging (don't just push)

A new auth flow, a new external integration, a new category of stored personal data, or any `firestore.rules` change. Every new personal-data field needs a stated purpose and a real deletion path from day one. Changes to Strava, webhook, OAuth or auth code get a review by the `security-reviewer` subagent first.

## Workflow

- **Verify before every commit** with `/verify` (type-check, lint, tests, clean production build). Don't commit on red.
- One PR per feature/fix. Merge routine/cosmetic PRs promptly; hold security- or data-sensitive ones for explicit confirmation. `/ship` runs the full branch → verify → review → PR flow.
- Self-review the diff on five axes — correctness, readability, architecture, security, performance. ~300 changed lines is the point to consider splitting; don't let unrelated changes ride along.
- When something breaks unexpectedly: reproduce, localize, fix the root cause, then leave a guard (a test, or a note in the right rule file). Don't patch the symptom and move on.
- After a PR merges, restart from main: `git fetch origin main && git checkout -B <branch> origin/main`.
- Durable learnings go into the relevant section here or in `.claude/rules/`, condensed — never a "done in session N" block.

## Local environment

Windows + VS Code, Node 22 (Netlify and CI use Node 20). `npm run dev` → `http://localhost:3000`. Env vars: see `.env.local.example`. **Never wrap `.env.local` values in quotes** — a quoted `FIREBASE_ADMIN_PROJECT_ID` once silently broke every Admin-SDK call with an opaque `aud`-mismatch. In PowerShell, `curl` is `Invoke-WebRequest`; use `curl.exe`.
