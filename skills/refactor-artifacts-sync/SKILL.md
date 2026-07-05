---
name: refactor-artifacts-sync
description: "Use this skill at the end of a refactor to bring the project's durable documentation back in sync with the code that just changed — the four standing artifacts architecture.md, flows.md, permissions.md, and tests-map.md. Because a refactor moves, renames, and re-layers code, these docs go stale silently; this skill diffs each artifact against the new reality and updates only what drifted. Trigger phrases: \"update the docs to match\", \"the architecture doc is stale now\", \"sync the documentation\", \"regenerate the flows/permissions map\", \"keep the docs current after the refactor\". This is the docs phase of the refactor-chain pipeline; it runs after refactor-write-up and before ship. It edits documentation files only — never product code."
---

# Artifacts Sync — refactor-chain · docs

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** docs · **Prerequisite:** refactor-write-up (the change narrative) · **Next:** refactor-publish-checklist / refactor-ship.
**Adaptivity / conditional:** repo-agnostic. Only edits documentation files; if an artifact doesn't exist yet, it offers to create it from the matching template.

## Purpose
Every refactor quietly rots the docs. When files move, layers get renamed, or permissions get
re-wired, the standing documents that describe the system — how it's built, how data flows,
who's allowed to do what, and where the tests live — stop matching reality. This skill keeps
four durable artifacts current: `architecture.md`, `flows.md`, `permissions.md`, and
`tests-map.md`. It reads the post-refactor code, diffs each artifact against what the code now
says, and updates only the parts that drifted — so the docs a teammate reads next week describe
the app that actually exists.

## When to use
- The chain reached the docs phase and `refactor-write-up` has produced the change narrative.
- Someone says "the architecture doc is out of date now", "sync the docs", "regenerate the flows map".
- After any structural/naming/permission refactor, before the change is handed off or merged.
- If the artifacts don't exist yet, this skill can scaffold them from `templates/` — ask first.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm updating the four documents that describe your app so they match what we just changed. I'm only editing docs, not code."
- "`architecture.md` was describing the old folder layout — I updated the two sections that moved. The rest was already correct, so I left it alone."
- "You don't have a `permissions.md` yet. Want me to create one from the template, or skip it?"
- "You are here: docs sync (4 documents, 3 needed changes, 1 was already fine)."
- "Say 'show technical details' to see the exact lines I changed in each doc."

## Method
1. **Locate the artifacts.** Look for `architecture.md`, `flows.md`, `permissions.md`,
   `tests-map.md` in `docs/`, the repo root, or wherever the project keeps them. Run
   `node scripts/checklist.mjs --find <target>` to report which exist and which are missing.
2. **Gather the new reality.** Use the `refactor-write-up` Change Report + `git diff` +
   `state.json` to know exactly what moved/renamed/re-layered — don't re-derive the whole app.
3. **Per artifact, diff doc vs code** and update ONLY the drifted parts:
   - **architecture.md** — module/layer map, folder structure, dependency direction. Fix moved
     directories, new/renamed layers, changed reference rules.
   - **flows.md** — key user/data flows end to end. Fix any flow whose steps now route through
     renamed or relocated code.
   - **permissions.md** — roles, guarded routes/actions, who-can-do-what. Fix guards that moved
     or were renamed; flag any permission the refactor touched (hand to `refactor-audit-trail`).
   - **tests-map.md** — which tests cover which behavior/module. Fix paths for moved tests;
     reflect any characterization tests added by `refactor-safety-net`.
4. **Preserve human prose.** Only rewrite the parts made wrong by the refactor; keep hand-written
   context, rationale, and diagrams intact.
5. **Create-if-missing (optional).** For any absent artifact, offer to scaffold it from the
   matching `templates/<artifact>.md` and populate it from the current code. Never force it.
6. Record which artifacts changed for the publish checklist. See `references/method.md` for the
   per-artifact drift-detection rules.

## Guardrails
- **Documentation-only. Never edits product code**, config, or tests — only the four `.md` artifacts.
- Surgical edits: change only what drifted; don't rewrite whole documents or discard human authoring.
- Don't invent facts. Every updated line must be sourced from the actual post-refactor code/diff.
- If an artifact's ownership is unclear or it's auto-generated, flag it rather than overwrite.

## Verify
- Plain: "Each of the four docs now describes the app as it actually is after the refactor — no stale folder names, no dead paths, no removed roles."
- Technical: every path/name referenced in the updated artifacts resolves in the current tree;
  no artifact references a moved/renamed/deleted symbol from the old layout; `checklist.mjs --find`
  shows each intended artifact present; the set of changed artifacts is recorded for the checklist.

## Resources
- `references/method.md` — per-artifact drift-detection rules and the "update only what changed" recipe.
- `examples/before-after.md` — worked example: `architecture.md` synced after a folder re-layer.
- `scripts/checklist.mjs` — prints this skill's steps as JSON and finds which artifacts exist (`--find`).
- `templates/architecture.md`, `templates/flows.md`, `templates/permissions.md`, `templates/tests-map.md` — one scaffold per artifact.

## Chain position
Runs in the **docs** phase, right after `refactor-write-up`. It consumes the change narrative +
diff and updates the durable docs. Its record of changed artifacts feeds
`refactor-publish-checklist` (which confirms all artifacts are current) and `refactor-audit-trail`
(permission changes as evidence), then on to `refactor-ship`.
