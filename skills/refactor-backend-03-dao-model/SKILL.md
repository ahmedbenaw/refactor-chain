---
name: refactor-backend-03-dao-model
description: "Use this skill when the data-access layer of a backend service needs tidying — trigger phrases include \"DAO cleanup\", \"DAO layer check\", \"fix the dao package\", \"split mapper and entity\", \"consolidate the model classes\", or \"step 3 check/fix\". It corrects `imp`→`impl` naming, separates DAO interfaces from implementations and mappers from entities using a deterministic filename-and-position table (file contents are never read to classify), and consolidates model classes into the shared model module by physically moving files while keeping package declarations byte-identical — zero import churn. Step 3 of 9 of the layered-backend governance lane in the refactor-chain bundle; works on any layered backend project (build system detected from the registry); supports check-only, fix-only, or check-then-fix."
---

# DAO & Model-Layer Tidy-Up — refactor-chain · backend lane · step 03/09

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work · **Prerequisite:** refactor-backend-02-module-rename · **Next:** refactor-backend-04-service.
**Adaptivity / conditional:** repo-agnostic. Check mode is advisory (report only); fix mode is behavior-preserving and confirmation-gated.

## Purpose
Bring the lowest code layer into shape before anything above it is touched: fix `imp`→`impl` directory naming (including compound variants like `serviceImp/`), put DAO implementations under `dao/impl/` while interfaces stay at `dao/` root, split `Mapper` and `Entity` classes into `dao/mapper/` and `dao/entity/`, and gather scattered model classes into the module's shared model artifact. The model consolidation is *compile-neutral by construction*: files move physically, `package` declarations stay byte-identical, so not a single `import` anywhere changes. Every classification decision comes from a deterministic filename-and-position table — never from reading file contents — so two runs on the same tree always produce the same result.

## When to use
- Audit only: "DAO layer check", "step 3 check" → produces a FAIL/WARN/INFO report, changes nothing.
- Repair: "DAO cleanup", "step 3 fix", "split mapper and entity", "consolidate the model classes".
- Both: "step 3 check and fix".
- Precondition: steps 01–02 done (stable module names); the user confirms the fix plan before execution.

## What I'll tell you (plain-language / ADHD-friendly)
- "You're at step 3 of 9. I'm tidying the data-access folders — your code keeps working the same."
- "First a report card: 3 must-fix items, 2 suggestions, 1 folder I'm deliberately leaving alone (it's a self-contained mini-app)."
- "Sorting is by filename only — I never guess from what's inside a file, so re-running me always gives the same answer."
- "Moving your model classes won't change a single import line — the package names stay exactly as they were."
- "One target file already existed with different contents — I stopped and I'm asking you which to keep instead of guessing."

## Method
Full rules in `references/method.md`; the shape is:
1. **Scope.** Freeze the scan scope: walk up `<parent>` links from the target module to the topmost in-repo build file; that directory is the search root for the whole run (excluding `target/`, `.git/`, build caches). Decided once in the scan phase, never re-decided mid-run.
2. **Exempt self-contained domains.** A directory that carries at least two of `entity|model / mapper|dao / service` itself, isn't one of the four standard layer directories, and isn't nested config, is an independent mini-domain: report it as INFO and skip it entirely (its imports still get updated if moves elsewhere require it).
3. **Check.** Run the audit items — impl naming, DAO separation, mapper/entity split, four-layer completeness, resources/mapper XML correspondence, model consolidation status — each rated FAIL (must fix), WARN (should fix), or INFO (note). Emit the report (`templates/output.md`). Stop here in check mode.
4. **Fix plan and confirmation.** Idempotency pre-check (what's already compliant), then list every file move and directory change; wait for explicit approval.
5. **Execute in fixed order:** (a) `imp`/`*Imp` → `impl`, with package and import updates; (b) DAO relocation per the deterministic table (`*Impl.java` → `dao/impl/`, `*Entity.java` → `dao/entity/`, `*Mapper.java` → `dao/mapper/`, `I`-prefixed interfaces stay put, everything else defaults to `dao/impl/`); (c) mapper/entity separation after a three-state location pre-check (only-elsewhere → migrate in; already-home → skip; both → keep the in-home copy, delete the stray, repoint imports — never migrate outward, never create new mapper packages outside `dao/`); (d) model consolidation into the shared model module — copy, packages untouched; (e) create any missing standard directories (directories only, no files).
6. **Move protocol, every file:** read original → conflict pre-check at destination → create at destination → verify content → delete original. Conflict policy is three-way: destination absent → move; identical content → drop the source duplicate; different content → stop and ask.
7. **Verify.** Post-checks V1–V5 (no `imp` residue, DAO placement correct, mapper/entity split, model classes centralized, model packages byte-identical to before), then compile.

## Guardrails
- Behavior is preserved (fix mode) or advisory-only (check mode).
- Hard negative scope: no build-file dependency edits, no new services or interfaces invented, no controller/business logic touched — this step moves and renames existing files only.
- Model classes: `package` lines and every referencing `import` are inviolable; break this and the compile-neutral guarantee dies.
- Classification is filename+position only; reading contents to classify is forbidden. New/updated imports use concrete class names (no wildcards), stable ordering, and simple names over inline fully-qualified references.
- Explicit confirmation before any change; deletion of moved originals only after verification.
- Preserve file encodings; `refactor-safety-net` baseline before, `refactor-verify` build gate after.

## Verify
Plain: "same folders, tidier shelves — and the compiler agrees nothing broke."
Technical: V1–V5 pass; a diff of `package` lines before/after model moves is empty; grep for old paths returns no residue; compile passes. Re-running the check reports everything compliant (idempotence). Then advance the harness gate: `node ~/.claude/skills/refactor-chain/scripts/orchestrate.mjs advance` (blocks on `--delta legal|drift`).

## Resources
- `references/method.md` — classification table, three-state mapper logic, move protocol, exemptions.
- `examples/before-after.md` — a worked DAO + model tidy-up.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — check-report and fix-report scaffolds.

## Chain position
Step 03 of the backend lane: consumes the stable, renamed tree from steps 01–02; hands a clean data layer to refactor-backend-04-service, which reorganizes the layer above it. `refactor-code-principles` and the review gate run near the end of every lane.
