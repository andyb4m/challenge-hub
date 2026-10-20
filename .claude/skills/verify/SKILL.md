---
name: verify
description: Run the full pre-commit verification for this repo (type-check, lint, tests, clean production build) and report a pass/fail table. Use before every commit, before opening a PR, or when asked whether the code is green.
allowed-tools: Bash(npx tsc *), Bash(npx next lint), Bash(npx next lint *), Bash(npx vitest *), Bash(npx next build), Bash(rm -rf .next), Bash(npm ci)
---

# Verify

Run these in order. **Stop at the first failure**, show the relevant error output, and fix it if the cause is clear and inside the current task's scope. Otherwise report it and stop.

1. If `node_modules` is missing: `npm ci`
2. Type-check: `npx tsc --noEmit`
3. Lint: `npx next lint`
4. Tests: `npx vitest run`
5. Clean production build: `rm -rf .next && npx next build && rm -rf .next`
   - The build runs without real Firebase env vars on Netlify previews. If it fails with `auth/invalid-api-key` or an Admin SDK init error, a module is initializing Firebase at module scope — fix it with the lazy-init pattern from CLAUDE.md. Don't add env vars to work around it.

## Report

A four-row table — check, ✅/❌, duration or error count — followed by one line: `Green — safe to commit.` or `Red — <what failed and the next step>`.

If $ARGUMENTS is `quick`, skip step 5 and say clearly that the build was skipped.
