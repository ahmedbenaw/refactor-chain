---
name: refactor-memory
description: "Use this skill when a question touches the refactor-chain's per-project persistent memory — what the pipeline remembers about this repo between sessions, where that memory lives, what belongs in it, and how to use a recalled fact safely. Trigger phrases include \"what do you remember about this repo\", \"didn't we park something last time\", \"where did that note go\", \"should this be remembered\", \"clear the chain's memory\", or a session starting with a memory banner injected at boot. Spans the improve phase (memory is written at session end) and the understand phase (memory is recalled at session start). Advisory about memory content; the hooks that write and read it already exist — this skill governs them, it does not reinvent them."
---

# Project Memory — refactor-chain · improve/understand

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** improve (capture, at session end) and understand (recall, at session start) · **Prerequisite:** none — the hooks are dormant until the project has chain state or history · **Next:** whatever phase the recalled context feeds.
**Adaptivity / conditional:** conditional on the project having `.refactor-chain/` state, history, or memory; on a repo the chain has never touched, both hooks stay silent.

## Purpose
The pipeline keeps a small, durable memory per project so the next session does not start blind:
which run was in flight, how the last run ended, what got parked. This skill defines the memory
discipline — what deserves persisting, what never does, how notes get written and recalled, and
the one safety rule that makes recall trustworthy: **a remembered fact is a hint until the live
repo confirms it.**

## When to use
- A session opens with the boot banner ("refactor-chain memory: last run…") and you must decide what to do with it.
- Someone asks what the chain remembers here, or why it remembered (or forgot) something.
- Deciding mid-run whether a decision or parked item is memory-worthy.
- Auditing or pruning `.refactor-chain/memory/sessions.jsonl`.

## What I'll tell you (plain-language / ADHD-friendly)
- "Last time we were here, the web-lane run finished clean and two scope-drift items got parked. I'll check the repo to confirm that's still true before acting on it."
- "I only remember the durable stuff — where the run stood, how it ended, what was parked. Never your conversation, never anything secret."
- "That note says a run was paused at step 3 of 7 — but memory can be stale. Give me a second to verify against the actual state file."
- "This decision is worth remembering; it'll be captured automatically when the session ends. You don't have to do anything."
- "Want the memory wiped for this project? That's one file, and deleting it is safe — the chain just starts fresh. Say 'show technical details' for the file layout."

## Method
1. **Know the mechanics** (full detail in `references/method.md`). Capture: the SessionEnd hook
   `memory-capture.mjs` appends one compact note per session to
   `<project>/.refactor-chain/memory/sessions.jsonl` — active-run position (`lane`, `phase`,
   `step`, `health`), flagged scope-drift notes, or the last run's outcome from `history.jsonl`.
   It is dormant unless the project has chain state or history, and it exits 0 no matter what.
   Recall: the SessionStart hook `boot.mjs` reads the **last** line and injects a one-line summary.
2. **Apply the persistence filter** when deciding what is memory-worthy: durable decisions,
   parked/scope-drift items, run outcomes and position — yes. Transcripts, secrets, tokens,
   personal data, transient debugging chatter — never. If it would not matter next week, it is
   not memory.
3. **Recall safely.** On seeing an injected memory line, treat every remembered fact as a claim to
   verify: check `state.json` before resuming a "paused run", check `history.jsonl` before citing
   an outcome, check the repo before acting on a parked item — the code may have moved on. This is
   the live-truth rule (the same discipline the `live-state-truth` skill teaches): the repo as it
   exists now always outranks what memory says about it.
4. **Inspect on demand.** `node scripts/checklist.mjs --recall <target>` prints the note count and
   the latest note so you can show the human exactly what is remembered.
5. **Prune deliberately.** Memory is append-only by the hook; humans may truncate or delete
   `sessions.jsonl` at will. Offer this whenever memory is stale or the human asks to forget.
6. When reporting on memory, fill `templates/output.md` (the memory audit scaffold).

## Guardrails
- **Advisory-only: this skill never edits product code, and it never hand-writes memory entries — capture belongs to the SessionEnd hook so the format stays uniform.**
- Never persist transcripts, secrets, credentials, or personal data; a note that needs any of those is not written.
- **Never act on a remembered fact without verifying it against the live repo first.** Stale memory presented as truth is worse than no memory.
- Do not reinvent the mechanism: `memory-capture.mjs` and `boot.mjs` already exist — govern them, reference them, do not fork them.

## Verify
- Plain: "I can say exactly what this project's memory contains, why each note qualified, and I checked the repo before trusting any of it."
- Technical: `sessions.jsonl` parses line-by-line; every note carries only durable fields
  (`activeRun` / `lastRun` / `flagged` / `at`); no secrets or prose transcripts present; any
  remembered claim used this session has a named live-repo confirmation (file + what was checked).

## Resources
- `references/method.md` — the note schema, persistence filter, recall-verification protocol, and pruning rules.
- `examples/before-after.md` — worked example: a stale "paused run" memory, recalled and verified.
- `scripts/checklist.mjs` — step checklist as JSON; `--recall <target>` prints the project's memory summary.
- `templates/output.md` — the memory audit scaffold.

## Chain position
Bridges the end of one run to the start of the next. The **improve** phase closes with capture
(SessionEnd → `sessions.jsonl`, alongside the self-improvement history that `refactor-improve` reads); the
next session's **understand** phase opens with recall (SessionStart → injected summary), which
feeds diagnosis with context — always filtered through live-repo verification before anything
downstream trusts it. `refactor-code-principles` and the review gate still close every lane; memory
never bypasses them.
