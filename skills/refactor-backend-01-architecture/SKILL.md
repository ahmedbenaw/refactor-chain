---
name: refactor-backend-01-architecture
description: "Use this skill when a layered backend project in any registry-detected stack needs to move from a flat pile of modules into a layered module architecture — trigger phrases include \"restructure my Maven project\", \"layered architecture migration\", \"architecture check\", \"organize modules by layer\", or \"make the build self-contained\". It is step 1 of 9 (the entry step) of the layered-backend governance lane in the refactor-chain bundle. Works on any multi-module backend project (Maven/Gradle, .NET solutions, Go/Cargo workspaces, and equivalents); behavior-preserving (build files, config paths, and package/import lines only)."
---

# Layered Architecture Restructure — refactor-chain · backend lane · step 01/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** none — lane entry step · **Next:** refactor-backend-02-module-rename.
**Adaptivity / conditional:** repo-agnostic — applies to any Maven/Gradle multi-module Java project (lane detection comes from the harness registry `refactor-chain/scripts/lib/languages.mjs`, which recognizes `pom.xml` / `build.gradle`).

## Purpose
Turn a flat multi-module Java build — dozens of sibling modules under one root — into a layered structure where every module lives in a container that states its role. Along the way, generate a self-contained root build (complete `dependencyManagement`, BOM imports, no reliance on an external corporate parent) and prove the result compiles. Nothing about runtime behavior changes: only build files, configuration path references, and Java `package`/`import` lines are touched.

## When to use
- The module list at the root has grown flat and roles are invisible ("restructure my Maven project", "organize modules by layer").
- The build inherits from a parent POM that doesn't exist in this repo and won't resolve standalone ("make the build self-contained").
- You want a structure audit before committing to moves ("architecture check", "structure validation").
- Precondition: a Maven or Gradle multi-module project with a root build file. The layer names below are defaults — the project may pick its own.

## What I'll tell you (plain-language / ADHD-friendly)
- "You're at step 1 of 9. I'm going to sort your modules into labeled boxes — your code keeps working the same."
- "First a dry run: here's the full move plan as a table. Nothing moves until you say go."
- "Please make sure you have a backup or a clean git state before I start — undo is one `git checkout` away."
- "That module didn't compile after the move — I'm reading the errors, adding the missing dependency, and retrying (attempt 2 of 3)."
- "Done. Every module compiled and packaged. Want the technical details of what changed in each POM?"

## Method
Follow `references/method.md` for the exhaustive rules; the shape is:
1. **Survey.** Inventory every module build file: `artifactId`, parent, packaging, dependencies. Note flat vs. grouped layout, external parents, and per-module dependency baselines (the "before" list used later to prove nothing was lost).
2. **Classify.** Assign each leaf module to a layer container using name patterns (`*-api`, `*-model`, `*-service`, `*-server`, `*-app`, `*-boot`, adapters, shared utils). Default containers: `platform/` (shared foundation), per-domain `{domain}/` holding `{domain}-domain/` (capabilities), `{domain}-composition/` (runnable assembly), and `{domain}-delivery/` (edge/BFF — created only when such a module exists). Rename freely; roles are what matter.
3. **Absorb tiny domains.** A domain with ≤ 2 leaf modules doesn't earn its own tree — fold its leaves into the nearest larger domain's matching container, and record the decision.
4. **Plan and confirm.** Emit the move plan (`templates/output.md`) — every move, every new container POM — and wait for explicit approval. Moves are confirmation-gated, always.
5. **Build the skeleton, then move.** Create container directories and aggregator POMs top-down; move leaves in; verify completeness; delete emptied source directories (never skip cleanup).
6. **Generate the self-contained root POM.** Scan every leaf's dependencies; classify each as internal-reactor, in-house platform, or third-party; emit `dependencyManagement` with framework BOM imports (`type=pom, scope=import`), pin internal modules to one project version property, keep genuinely special versions; then strip now-redundant `<version>` tags from leaf POMs.
7. **Compile-verify-fix loop.** Pre-scan Java imports to predict missing dependencies before the first build; run the full compile; group errors by module; diagnose by category (missing internal artifact, missing framework module, missing third-party, or a renamed/retired artifact ID needing its modern coordinate); fix root-first (`dependencyManagement`) then leaf (version-less); recompile per module against its baseline; finish with a full package build and, optionally, an application start check.

## Guardrails
- Behavior is preserved — this is a structural refactor only.
- Hard edit scope, no exceptions: build files (`pom.xml`/`*.gradle*`), config files (`*.yml`/`*.yaml`/`*.properties`) path references, and `package`/`import` lines in `.java` files. No method bodies, ever.
- No move happens without the user approving the printed plan; remind about backup/clean-git first.
- Preserve each file's original encoding and BOM (edit in place; don't rewrite whole files).
- Never skip old-directory cleanup or the compile verification phase.
- Cross-checks: `refactor-safety-net` should hold a baseline before this step; `refactor-verify` re-runs the build gate after it.

## Verify
Plain: "everything still builds, and every module is in exactly one labeled box."
Technical: aggregator POMs are `packaging=pom` and their `<modules>` match directories on disk; no stale `artifactId` anywhere (global search); root build carries the BOM imports and `dependencyManagement`; full compile has zero errors and `package -DskipTests` succeeds; per-module dependency baselines match (nothing silently dropped); old directories gone. Then advance the harness gate: `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance` (it blocks on `--delta legal|drift` findings).

## Resources
- `references/method.md` — full classification, root-POM, and compile-loop rules.
- `examples/before-after.md` — a worked flat→layered migration.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the move-plan / completion-report scaffold.

## Chain position
Entry step of the backend lane (01 → 02 module rename → 03 DAO/model → … → 09). Fed by `refactor-understand`/`refactor-diagnose` lane selection; feeds refactor-backend-02-module-rename. `refactor-code-principles` and the review gate run near the end of every lane.
