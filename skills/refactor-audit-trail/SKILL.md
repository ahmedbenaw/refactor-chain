---
name: refactor-audit-trail
description: "Use this skill to keep a forensic-grade, tamper-evident record of every change a refactor-chain run made — what changed, when, at which checkpoint, and why — so review and compliance have a defensible evidence log rather than a fuzzy memory. It reconstructs the chain of custody from the harness state, checkpoints, git history, and verify results into an ordered, hash-linked audit log. Trigger phrases: \"log every change for the record\", \"we need an audit trail\", \"chain of custody for this refactor\", \"what changed and when and why\", \"produce evidence for compliance/review\", \"prove exactly what we did\". This is the docs/ship phase of the refactor-chain pipeline; it runs alongside the write-up and before ship. It reads and records — it never edits product code."
---

# Audit Trail — refactor-chain · docs/ship

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** docs/ship · **Prerequisite:** the lane produced verified steps + checkpoints · **Next:** refactor-publish-checklist / refactor-ship.
**Adaptivity / conditional:** repo-agnostic and advisory. It records evidence; it never changes product code. Especially valuable when the refactor touches regulated code, permissions, or data.

## Purpose
When a refactor is later questioned — by a reviewer, an auditor, or a future engineer asking
"why did this change?" — a summary isn't enough. This skill produces the forensic answer: an
ordered, tamper-evident log of every change, each entry stating **what** changed (files, symbols),
**when** (timestamp), **at which checkpoint** (rollback SHA), and **why** (the step's intent).
It borrows a computer-forensics discipline — a chain of custody where each entry is hash-linked
to the one before it, so the log can't be quietly edited after the fact — and grounds every entry
in real harness state, git history, and verify results.

## When to use
- The refactor touches regulated, security-, permission-, or data-sensitive code and needs defensible evidence.
- Someone asks "what exactly changed and why?", "we need an audit trail", "chain of custody".
- Any run where "prove what we did" matters more than "summarize what we did" (the write-up is the summary; this is the evidence).
- Runs alongside `refactor-write-up`; the write-up is for humans, the audit trail is for the record.

## What I'll tell you (plain-language / ADHD-friendly)
- "I'm building an evidence log of everything this refactor did — one line per change, each with a time, a rollback point, and the reason. I'm only recording, not changing anything."
- "Entry 7 of 12: at 14:03, step `refactor-web-05-naming` renamed `getUsr` → `getUser` in 4 files; checkpoint `pre-web-05`; reason: consistent API naming; behavior verified identical."
- "Each entry is hash-linked to the previous one — if anyone edits the log later, the chain breaks and you'll see it."
- "This is separate from the plain-English summary. This one is for the reviewer/auditor who needs the exact record."
- "Say 'show technical details' for the full hash chain and per-file diffs."

## Method
1. **Gather the sources of truth.** Read `state.json` (steps, verify deltas, self-heals,
   `checkpoints`, `lastEdit`), `git log`/`git diff` since the first checkpoint, and — if present —
   the `refactor-artifacts-sync` list of permission changes. Run `node scripts/checklist.mjs` for
   the step outline.
2. **Reconstruct the timeline.** Order every change event chronologically: each step's start,
   each checkpoint taken, each edit recorded, each verify result, each self-heal + rollback.
3. **Write one entry per change** with the four forensic fields: `what` (files + symbols),
   `when` (ISO timestamp), `checkpoint` (the rollback SHA in effect), `why` (the step's intent).
   Include the verify verdict (`legal`/`clean`/`drift→healed`) as corroborating evidence.
4. **Hash-link the chain.** Give each entry `prevHash` = hash of the previous entry and
   `hash` = hash(this entry + prevHash). The genesis entry links to the baseline. Any later edit
   to an entry breaks every downstream hash — that's the tamper-evidence.
5. **Flag sensitive events.** Mark entries that touched permissions, auth, or data so a reviewer
   can jump straight to them.
6. Emit the log to `templates/output.md` and, for durability, append the machine form to
   `<target>/.refactor-chain/audit-log.jsonl`. See `references/method.md` for the entry schema
   and the hash-chain rules.

## Guardrails
- **Record-only. Never edits product code.** It reads harness/git state and writes an evidence log.
- Every entry must be sourced from real state/git — never fabricate a "why". If a step's intent
  isn't recorded, mark the reason "unstated" rather than inventing one.
- The log is append-only. Correcting a mistake means appending a correction entry, not editing
  history (editing would break the hash chain — by design).
- Timestamps and SHAs are copied verbatim from the harness/git; don't paraphrase them.

## Verify
- Plain: "There's one honest line for every change we made, in order, each with a time, a rollback point, and a reason — and the log can't be secretly altered."
- Technical: recompute the hash chain top-to-bottom — every `hash` matches `hash(entry+prevHash)`
  and the chain is unbroken; entry count matches the number of change events in `state.json`/`git`;
  every entry's `checkpoint` SHA exists in `state.json.checkpoints`; sensitive entries are flagged.

## Resources
- `references/method.md` — the entry schema, the hash-chain construction rules, and the forensic-field definitions.
- `examples/before-after.md` — worked example: a run's raw state → its hash-linked audit log.
- `scripts/checklist.mjs` — prints this skill's steps as JSON.
- `templates/output.md` — the audit-log format (human table + the `.jsonl` machine schema).

## Chain position
Runs in the **docs/ship** phase, alongside `refactor-write-up` (summary vs evidence). It consumes
`state.json` + git + the artifacts-sync permission list, and its evidence log + flagged sensitive
events feed `refactor-publish-checklist` (compliance gate) and `refactor-ship` (attached to the PR/handoff).
