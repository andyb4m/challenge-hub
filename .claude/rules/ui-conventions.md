---
paths:
  - "src/components/**"
  - "src/app/**/*.tsx"
  - "src/app/globals.css"
  - "tailwind.config.ts"
---

# UI conventions

## Design system

Dark navy theme (`#0f0f23` / `#16213e`), indigo→purple gradient primary buttons. Inter via a runtime Google Fonts `<link>` — **not** `next/font`, which keeps builds offline-safe. Ported from the legacy app; see `docs/legacy-summerfit-handoff.md` before restyling.

## Patterns to follow

- **Loading states are shape-matched skeletons**: the `Skeleton` primitive (`src/components/ui/skeleton.tsx`) plus a page-specific skeleton component next to each page's real components. Exception: `RequireAuth`'s own loading state is deliberately plain text — it runs before any page-specific data exists.
- **`RequireAuth`** (`src/components/auth/require-auth.tsx`) is the client page guard. It preserves the destination via `?next=` (sanitized by `safeNextPath`), so invite links survive login/registration.
- **Floating menus**: `AccountMenu` (`src/components/account-menu.tsx`) is hand-rolled — `useState` plus a document `pointerdown` / `Escape` listener for click-outside, absolutely positioned against a `relative` wrapper. Reuse this; don't add a library.
- **Google profile photos** (`lh3.googleusercontent.com`) need `referrerPolicy="no-referrer"` on every `<img>`, or they silently 404 (hotlink protection).
- **Pages needing `generateMetadata` can't be `"use client"`.** Use the `/join/[token]` split: server `page.tsx` with `generateMetadata`, rendering a client child (`join-content.tsx`) for the interactive part.
- **Never hardcode zone numbers in copy.** Any text stating a bonus %, multiplier, or tier must read the challenge's actual `zoneConfig`. `leaderboard.tsx` once showed a literal `×1.15` / `80/20` after rules became editable.
- **Two-surface config editing**: `ZoneConfigEditor` and the variety kinds editor are shared form UIs used both in `ChallengeForm` at creation and in a creator-only collapse/expand manage card (`ZoneManageCard`, `VarietyManageCard`) on the challenge page (zone saves go through `updateZoneConfig()`). Follow this for any new editable challenge config.

## Navigation and layout

- Mobile primary nav is `BottomNav` (`src/components/bottom-nav.tsx`): fixed, `sm:hidden`, three tabs — Challenges / Activity / Profile — with active state via a `usePathname()` prefix match.
- `AppShell` (`src/components/app-shell.tsx`) shows `BottomNav` only when signed in, reserves bottom padding so the bar doesn't cover content, and renders `SiteFooter`.
- The header's `AccountMenu` is desktop-only (`hidden sm:block` in `site-header.tsx`). On mobile the header is just the wordmark; **Sign out lives in `SignOutButton` on `/profile`**.
- `/activity` mirrors the nav tab via `useMyActivities` and `RecentActivityCard`. The `/challenges` hub keeps its 5-item recent-activity teaser with a "See all" link.
- "New challenge" is an icon-only `Button size="icon"`, not a fourth tab: nav tabs are places you return to; creating is a one-off action.
- **Legal links render in exactly one place**: `SiteFooter`, which is global via `AppShell` (German law requires the Impressum to be reachable before registration). Don't add `LegalLinks` anywhere else — a page-level copy on `/profile` caused visible duplication and was reverted.

## Accessibility baseline (no formal audit yet — do the basics now)

Native semantic elements over `div` + `onClick`, visible focus states, `aria-label` on icon-only controls (already the convention — see `AccountMenu` and the icon-only "New challenge" button), keyboard operability (Enter activates, Escape closes). Retrofitting later costs far more.
