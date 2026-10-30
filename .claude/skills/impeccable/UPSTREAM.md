# Vendored: Impeccable design skill

Copied from https://github.com/pbakaus/impeccable (`plugin/skills/impeccable/`), Apache 2.0 (see `LICENSE`, `NOTICE.md`).

- Upstream commit: `df3a4abe7d0840d5f60324812c432e00b66a4e75` (skill v4.8.0, engine 0.1.18)
- Files are unmodified. Only `LICENSE`, `NOTICE.md` and this file were added.

## Why vendored instead of the plugin

Claude Code doesn't load plugins declared in a repo's `.claude/settings.json` in cloud sessions, but it does load `.claude/skills/`. Vendoring also pins the version, so no upstream change reaches this repo unreviewed.

## Deliberately left out

The plugin's hooks (`hooks/hooks.json`: SessionStart, PostToolUse on every Edit/Write, Stop). They run the engine binary unsandboxed on every edit. Here the skill runs only when invoked (`/impeccable audit`, `critique`, `polish`, …). Don't run `/impeccable hooks on`, which would install them into `.claude/settings.local.json`.

## Engine binary

`scripts/impeccable` downloads a prebuilt engine from the upstream GitHub release on first use, into `~/.impeccable/` (outside the repo). It refuses any download whose sha256 doesn't match `scripts/engine-checksums.txt`. Without network access the skill falls back to reading the project files directly.

Telemetry (anonymous usage data for its `generate` feature) is turned off in `.impeccable/config.json`.

## Updating

Re-copy `plugin/skills/impeccable/` from a newer upstream commit, review the diff (especially `scripts/`), and update the commit above.
