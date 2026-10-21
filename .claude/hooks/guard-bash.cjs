#!/usr/bin/env node
// PreToolUse hook (Bash): hard guardrails that hold even in auto/accept-edits
// mode. CLAUDE.md asks Claude to behave; this *enforces* it.
//
//   - never push directly to main, never force-push   -> deny
//   - deploying Firestore rules from the CLI           -> ask (needs a human)
//
// Everything else falls through to the normal permission rules in settings.json.

const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

function currentBranch(cwd) {
  const r = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : "";
}

let input = {};
try {
  input = JSON.parse(fs.readFileSync(0, "utf8"));
} catch {
  process.exit(0);
}

const cmd = String(input?.tool_input?.command || "");

function decide(permissionDecision, reason) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision,
        permissionDecisionReason: reason,
      },
    }),
  );
  process.exit(0);
}

// Split on shell separators so "npm test && git push origin main" is caught too.
const parts = cmd.split(/&&|\|\||;|\n/).map((s) => s.trim());

for (const part of parts) {
  if (/^git\s+push\b/.test(part)) {
    if (/(\s|^)(-f|--force|--force-with-lease)(\s|=|$)/.test(part)) {
      decide("deny", "Force-push is not allowed in this repo. Push a new commit instead.");
    }
    // Explicit "main" target, or a bare/HEAD push while main is checked out.
    const explicitMain = /\s(origin\s+)?(HEAD:)?(refs\/heads\/)?main(\s|$)/.test(part);
    const implicitTarget = !/\s[\w./-]+:[\w./-]+/.test(part) && !/\sorigin\s+(?!HEAD\b)[\w./-]+/.test(part);
    const onMain = implicitTarget && currentBranch(input.cwd || process.cwd()) === "main";
    if (explicitMain || onMain) {
      decide(
        "deny",
        "Never push to main directly. Push a feature branch and open a PR (see /ship).",
      );
    }
  }
  if (/^(npx\s+)?firebase\s+deploy\b/.test(part)) {
    decide(
      "ask",
      "Deploying Firebase config/rules is a production change. Andy must confirm (CLAUDE.md: ask before rules changes).",
    );
  }
}

process.exit(0);
