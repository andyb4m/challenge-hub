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

### Not started yet
- [ ] `feature/auth-and-users` — login, register, user profile, Strava connect UI
- [ ] `feature/challenges-core` — challenge creation, invite links, join flow, leaderboard
- [ ] `feature/strava-integration` — OAuth callback, webhook handler, activity backfill
- [ ] Firebase Auth providers enabled in Firebase console (email/password + Google)
- [ ] Strava API credentials (deferred — not available during session 1)

---

## Local environment

Developer is on **Windows**, VS Code, Node.js v22. Dev server at `http://localhost:3000`.

`.env.local` status:
- `NEXT_PUBLIC_FIREBASE_*` — filled in (project: `runningchallenge-6c1f8`)
- `FIREBASE_ADMIN_*` — **still needs service account key** (Firebase console → Project Settings → Service Accounts → Generate new private key)
- Strava values — **left blank**, fill in when credentials are available

---

## Firestore schema
