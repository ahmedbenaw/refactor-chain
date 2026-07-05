---
name: refactor-backend-02-module-rename
description: "Use this skill when, after the layered restructure, module names no longer say what modules do and the user asks for semantic renames — trigger phrases include \"module rename\", \"rename modules to match their role\", \"rename server to controller\", \"naming pass on the modules\", or \"architecture fine-tuning\". It renames modules per a project-chosen mapping (example convention `{module}-server` → `{module}-controller`, `{module}-server-com` → `{module}-service`) and propagates the change through directories, artifactIds, container module lists, dependencyManagement, every dependency reference, and Java package/import lines. Step 2 of 9 of the layered-backend governance lane in the refactor-chain bundle; works on any layered backend project (build system detected from the registry); idempotent — already-renamed modules are skipped."
---

# Semantic Module Rename — refactor-chain · backend lane · step 02/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-01-architecture · **Next:** refactor-backend-03-dao-model.
**Adaptivity / conditional:** repo-agnostic — the rename mapping itself is project-chosen; the skill supplies the safe propagation machinery.

## Purpose
After step 01 the tree is layered, but module names may still carry legacy or template suffixes that hide their role. This skill applies a small, explicit rename mapping — for example `{module}-server` → `{module}-controller` (the HTTP edge) and `{module}-server-com` → `{module}-service` (the business implementation) — and then updates *everything that refers to the old names*: directories, each module's own `artifactId`, the parent container's `<modules>` list, the root `dependencyManagement`, every cross-module `<dependency>`, and affected Java `package`/`import` lines with the matching physical source relocation. The mapping is an example convention; the project picks its own pairs, and the propagation rules stay identical.

## When to use
- The project completed step 01 and module names still don't state their layer role ("module rename", "naming pass on the modules").
- A house convention exists (or is being adopted) that certain suffixes map to clearer ones ("rename server to controller", "rename server-com to service").
- Precondition: the modules named in the mapping actually exist under their capability container. If a module was already renamed, the skill notes it and skips — safe to re-run.

## What I'll tell you (plain-language / ADHD-friendly)
- "You're at step 2 of 9. I'm renaming modules so the name says the job — your code keeps working the same."
- "Here's the rename table: 4 modules, old name → new name. Nothing changes until you approve it."
- "Two modules already have the new names — skipping those, no harm done."
- "I rename the depended-upon module first, then the one that depends on it, so the build is never broken halfway."
- "A compile error appeared after the rename — one dependency still pointed at the old name; fixed and re-verified (attempt 2 of 3). Want the technical details?"

## Method
Full rules in `references/method.md`; the shape is:
1. **Collect the mapping.** Confirm (or propose from convention) the exact old→new pairs, `{module}` expanded per business module. Scan each capability container for the old names; mark absent/already-renamed entries as skips (idempotence).
2. **Plan and confirm.** Emit the rename plan (`templates/output.md`) listing every directory, POM edit, and package move; wait for explicit approval — never run silently.
3. **Order the renames.** Rename the *depended-upon* module before its dependents (e.g. service before controller) so no intermediate state has a dangling reference.
4. **Rename directories**, then update POMs: the renamed module's own `<artifactId>`; the container's `<module>` entries; the root `dependencyManagement` artifactIds; every `<dependency>` project-wide that references an old name.
5. **Match exactly, longest first.** Replace only where the *entire* `artifactId` equals an old name — never substring matches — and process longer old names before their prefixes (else `x-server-com` gets mangled by the `x-server` rule). Deployment-adapter siblings that merely share the prefix (e.g. `{module}-server-springcloud` and other platform adapters) are explicitly excluded and untouched.
6. **Rewrite packages and relocate sources.** Apply the same longest-first mapping to `package` and `import` lines project-wide, excluding adapter and framework package namespaces; move the source directories under `src/main/java` to match the new package paths.
7. **Verify.** Global search proves zero old-name residue in POMs and imports; compile passes; emit the completion report.

Config files usually need nothing — but check MyBatis `mapper-locations`-style paths that embed a module name, and leave the registered service name (`spring.application.name` or equivalent) alone unless the user explicitly wants service discovery renamed too.

## Guardrails
- Behavior is preserved — rename and reference propagation only; no modules added, deleted, or moved across layers.
- Runs only after step 01's structure exists; don't apply it to an arbitrary tree.
- Exact-match artifactId replacement; longest-match-first ordering; adapter exclusion list honored.
- The renamed module's `<parent>` reference does not change (its container wasn't renamed).
- Explicit user confirmation before executing; idempotent skip on re-run.
- Preserve original file encodings; edit in place, move directories with `mv`/`git mv`.
- Cross-checks: `refactor-safety-net` baseline should predate the rename; `refactor-verify` re-runs the build gate after.

## Verify
Plain: "every module answers to its new name, and nobody still calls it by the old one."
Technical: directories renamed; each module's `artifactId` equals its new name; container `<modules>` and root `dependencyManagement` updated; project-wide grep for `<artifactId>{old}</artifactId>` and for old package prefixes in `import`/`package` lines returns nothing (adapters excluded); compile passes. Then advance the harness gate: `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance` (blocks on `--delta legal|drift`).

## Resources
- `references/method.md` — ordering, matching, exclusion, and package-rewrite rules.
- `examples/before-after.md` — a worked two-pair rename.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — rename-plan / completion-report scaffold.

## Chain position
Step 02 of the backend lane: fed by refactor-backend-01-architecture's layered tree; feeds refactor-backend-03-dao-model, which assumes stable module names. `refactor-code-principles` and the review gate run near the end of every lane.
