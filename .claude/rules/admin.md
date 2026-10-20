---
paths:
  - "src/app/admin/**"
  - "src/app/api/admin/**"
  - "src/lib/admin/**"
  - "tests/**/admin*/**"
  - "tests/**/admin-*.test.ts"
---

# Admin dashboard

`/admin` is the app's only cross-user read. **Its security boundary is the API route, not the page.**

- `isAdminEmail()` (`src/lib/admin/access.ts`) checks a verified ID token's `email` claim against the server-only `ADMIN_EMAIL` env var. It fails closed if unset (tested — keep it that way).
- `GET /api/admin/dashboard` and `GET /api/admin/users/[uid]` are the only routes that read across all users and challenges via the Admin SDK. Each re-checks `isAdminEmail` itself.
- No `firestore.rules` change was needed or made — the fan-out stays server-side on purpose.
- The pages have no server-side gate: any signed-in user can load the shell, the API returns 403, and no data reaches a non-admin. That's consistent with "client code isn't trusted".
- No nav link anywhere — Andreas reaches it by URL only, so it never renders for anyone else.
- KPI math (`buildAdminDashboard` in `src/lib/admin/stats.ts`) is pure and Admin-SDK-free, so it's unit-tested directly rather than through mocked Firestore. Keep new metrics in that pure layer.
