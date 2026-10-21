---
paths:
  - "src/lib/strava/**"
  - "src/app/api/strava/**"
  - "src/app/api/account/**"
  - "src/lib/auth/**"
  - "tests/**/strava*/**"
  - "tests/**/strava-*.test.ts"
---

# Strava sync and auth security

This is the app's highest-consequence code path: cross-user data writes triggered by unauthenticated input. Before finishing any change here, hand the diff to the `security-reviewer` subagent. Don't assume the surface is still sound because it was last time.

## Two real vulnerabilities, both fixed — don't regress them

1. **Webhook forgery.** `POST /api/strava/webhook` is unauthenticated (that matches Strava's protocol — there's no per-event signature), so delete/deauth events used to be trusted outright. Fix: re-fetch from Strava before acting.
   - `fetchStravaActivity` returns `null` on 404 (not a throw), so "confirmed gone" is distinguishable from a transient error.
   - `removeStravaActivity` only proceeds if the activity is genuinely gone.
   - `syncStravaActivity` self-heals if create/update events arrive for something since deleted.
   - `object_id` / `owner_id` / `aspect_type` from the body only decide *what* to re-fetch with our stored credentials; only the re-fetched canonical activity is written.
2. **Race condition.** Concurrent syncs for the same activity could double-count. Reconcile functions now run inside `db.runTransaction`.

Optional defense in depth: `STRAVA_SUBSCRIPTION_ID` env var (rejects events with a mismatched `subscription_id`) — not set yet, see `docs/tech-debt.md`. The core fix doesn't depend on it.

## OAuth

The `state` param is HMAC-signed with `STRAVA_CLIENT_SECRET` (`signState` / `verifyState` in `src/lib/strava/oauth.ts`). The earlier unsigned version would have let anyone who knew a member's uid link their own Strava account to that uid.

Strava's "Authorization Callback Domain" (strava.com/settings/api) must match the live domain — currently `fit-challenge-hub.netlify.app`, bare domain. It broke once unnoticed because Strava always whitelists `localhost`, where all testing happened. Revisit if a custom domain replaces the Netlify one.

## How to review a change here

Map every point where untrusted data crosses in — webhook body, OAuth params, form input, third-party API responses — and run a STRIDE pass over each boundary (spoofing, tampering, repudiation, disclosure, DoS, privilege escalation). Then do a second, independent pass that tries to *disprove* each candidate finding before reporting it. This two-pass method is what caught both vulnerabilities above.
