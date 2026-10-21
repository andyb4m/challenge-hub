#!/usr/bin/env node
// PostToolUse hook (Edit|Write): lint the file Claude just changed and feed
// any errors straight back to Claude so it fixes them in the same turn.
//
// Exit codes (Claude Code hook protocol):
//   0 = fine, nothing to say
//   2 = stderr is shown to Claude (the edit already happened; this is feedback)
//
// Written in Node rather than bash so it runs identically on Windows and in CI.

const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

function readStdin() {
  try {
    return JSON.parse(fs.readFileSync(0, "utf8"));
  } catch {
    return {};
  }
}

const input = readStdin();
const filePath = input?.tool_input?.file_path;
const projectDir = process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd();

if (!filePath || !/\.(ts|tsx)$/.test(filePath)) process.exit(0);

const rel = path.relative(projectDir, path.resolve(projectDir, filePath));
if (rel.startsWith("..") || !/^(src|tests)[\\/]/.test(rel)) process.exit(0);

const eslintBin = path.join(projectDir, "node_modules", "eslint", "bin", "eslint.js");
if (!fs.existsSync(eslintBin)) process.exit(0); // deps not installed yet — don't block

const result = spawnSync(process.execPath, [eslintBin, "--format", "stylish", rel], {
  cwd: projectDir,
  encoding: "utf8",
  timeout: 60_000,
});

if (result.status === 1) {
  process.stderr.write(
    `ESLint found problems in ${rel}. Fix them before moving on:\n${result.stdout}`,
  );
  process.exit(2);
}

process.exit(0);
