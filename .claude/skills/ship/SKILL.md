---
name: ship
description: Take the current work from finished code to an open pull request — branch, verify, independent review, commit, push, PR. Run only when Andy asks to ship, open a PR, or wrap up a change.
disable-model-invocation: true
argument-hint: "[short description of the change]"
---

# Ship: $ARGUMENTS

Follow these steps in order. Don't skip the reviews to save time.

## 1. Branch hygiene
- `git status` and `git branch --show-current`. If on `main`, create a branch: `git switch -c <type>/<kebab-summary>` (types: `feat`, `fix`, `chore`, `docs`, `refactor`).
- `git fetch origin main` and check the branch is based on current `origin/main`. If it's behind, say so and ask before rebasing.

## 2. Scope check
- `git diff origin/main --stat`. Over ~300 changed lines, or containing unrelated changes → propose a split and wait for Andy's answer.

## 3. Verify
- Run the `/verify` skill. Red → stop and fix, or report.

## 4. Independent review
- Hand the branch to the **diff-reviewer** subagent.
- If any changed file matches Strava, webhook, OAuth, auth, account, admin, `src/app/api/**` or `firestore.rules`, also hand it to the **security-reviewer** subagent.
- Fix every "Must fix" item and re-run `/verify`. Any `VERDICT: BLOCK` → stop and report to Andy.

## 5. Commit
- Conventional message: `<type>: <imperative summary>` plus a short body explaining *why*.

## 6. Durable learnings
- If this change established or changed a convention, update the matching section in `CLAUDE.md` or `.claude/rules/*.md` in place, condensed. If it closed an item in `docs/tech-debt.md`, delete that item.

## 7. Push and open the PR
- `git push -u origin HEAD`, then `gh pr create` with:
  - **What & why** (2–4 bullets)
  - **How verified** (the `/verify` table)
  - **Review notes** (reviewer verdicts, and anything deliberately not fixed)
  - **Manual steps after merge**, e.g. "republish `firestore.rules` in the console" or "set env var X in Netlify". Write "none" if there are none.
- If the change is on the "ask before merging" list in CLAUDE.md (auth flow, external integration, new personal data, rules change), say so at the top of the PR body and **don't merge**.
- Otherwise, report the PR URL and stop. Andy merges.
