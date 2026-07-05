---
name: refactor-understand
description: "Use this skill when someone points refactor-chain at a project and you first need to understand \"what is this codebase?\" before touching anything — reading manifests, lockfiles, CI, and folder structure to summarize the stack, entry points, and how it builds/tests. This is the understand-phase entry point of the refactor-chain pipeline; it runs read-only, has no prerequisite, and feeds the diagnostic engine (refactor-diagnose). Trigger phrases: \"look at this repo\", \"what is this project\", \"can you refactor this\" (before any lane is chosen), \"get your bearings first\"."
---

# Understand the Project — refactor-chain · understand

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** understand · **Prerequisite:** none (entry) · **Next:** refactor-diagnose.
**Adaptivity / conditional:** repo-agnostic — works on any language/platform; degrades gracefully when files are missing.

## Purpose
Before refactor-chain classifies or changes anything, it needs a plain, accurate picture of what the project *is*. This skill quietly reads the non-code truth of the repo — package manifests, lockfiles, CI config, folder layout, test setup — and produces a short "here's what I'm looking at" summary. It touches nothing, changes nothing, and hands a structured project profile to the diagnostic engine so every later decision rests on real evidence, not guesses.

## When to use
- The very first thing the chain does on a new target directory.
- Someone says "look at this repo", "what even is this", "can you clean this up" and no lane is chosen yet.
- You (or a later skill) need to know the stack, framework, package manager, or how the project builds/tests.
- Re-run any time the target directory changes or a monorepo subtree is selected.

## What I'll tell you (plain-language / ADHD-friendly)
- "Let me get my bearings first — I'm only reading, not changing anything."
- "This looks like a Next.js web app (React + TypeScript), using pnpm, with tests in Vitest and CI on GitHub Actions."
- "I found more than one project in here — it's a monorepo. I'll list the pieces so you can pick where to start."
- "Heads up: I don't see any tests. That's fine, but it means I'll add a safety net before I change code later."
- "That's all I needed to look at (1 of 1). Want the quick summary, or the full technical breakdown?"

## Method
1. Run `node scripts/checklist.mjs` to load this skill's steps as JSON, or use the harness signal collector directly: `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>`.
2. Read the **manifests** (`package.json`, `pom.xml`, `go.mod`, `pyproject.toml`, `Cargo.toml`, `*.csproj`, `pubspec.yaml`, `Gemfile`, `composer.json`) to name the stack and package manager.
3. Read the **lockfiles** present to confirm the real package manager (pnpm vs yarn vs npm, poetry vs pip) and pin reproducibility.
4. Read **CI/build** config (`.github/workflows`, `.gitlab-ci.yml`, `Jenkinsfile`, `Makefile`, `Dockerfile`) to learn the real build/test/lint commands the team already runs.
5. Map **structure** — top-level folders, entry points, where source vs tests live; detect **monorepo** (workspaces / nx / turbo / lerna / multiple manifests).
6. Note **test setup** (framework + whether tests exist at all) — this decides whether a later baseline step must first add a safety net.
7. Fill `templates/output.md` into a Project Profile and hand it to `refactor-diagnose`. See `references/method.md` for the exhaustive field-by-field rules.

## Guardrails
- **Read-only. Advisory only.** This skill never edits, never runs install/build, never mutates the repo. It only reads files and reports.
- Never infer a package manager from `package.json` alone — confirm with the lockfile actually present.
- If a manifest is missing or unparseable, record "unknown" and move on; never block the chain on one missing file.
- Do not descend into `node_modules`, `dist`, `build`, `target`, `vendor`, `Pods`, `.git` (the harness walker already skips these).

## Verify
- Plain: "I can now say in one sentence what this project is, how it builds, and how it's tested." If you can't, re-read the missing piece.
- Technical: `node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>` returns JSON with `manifests`, `framework`, `lockfiles`, `monorepo`, `testFramework`, `hasTests` populated; the Project Profile mirrors those fields with no `TODO` left.

## Resources
- `references/method.md` — full field-by-field intake rules and the stack-detection matrix.
- `examples/before-after.md` — worked example: raw repo → Project Profile.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the Project Profile scaffold this skill fills in.

## Chain position
Entry point of the **understand** phase. Nothing precedes it. It reads the repo and produces the Project Profile that `refactor-diagnose` consumes to classify the request into `{case, os, platform, confidence, mode}`. `refactor-assessment-map` and `refactor-legacy-assess` build on the same profile. `refactor-code-principles` + the review gate run near the end of every lane.
