# Tech debt and deferred work

Open items only. When one is done, delete it (the PR carries the history) and, if it left a durable lesson, put that lesson in `CLAUDE.md` or the matching `.claude/rules/` file.

- [ ] **`STRAVA_SUBSCRIPTION_ID` not set.** Optional defense-in-depth for the webhook (rejects events with a mismatched `subscription_id`); the core security fix doesn't depend on it. Get the value with `GET https://www.strava.com/api/v3/push_subscriptions` using `client_id` / `client_secret` query params. Set it in both `.env.local` and Netlify.
- [ ] **PWA not verified on a real device.** "Add to Home Screen" on iOS Safari / Android Chrome is untested beyond local `next build && next start` header and manifest checks.
- [ ] **Datenschutz placeholder**: Firestore server region (Firebase console → Firestore → location) is needed for the EU-transfer clause. Flagged inline on the page.
- [ ] **Strava dashboard "Website" field** still shows the old `runningchallenge.netlify.app`. Cosmetic only, not used by OAuth.
- [ ] **No formal accessibility audit** (contrast, screen readers, WCAG 2.1 AA). Baseline practices are in `.claude/rules/ui-conventions.md`.
