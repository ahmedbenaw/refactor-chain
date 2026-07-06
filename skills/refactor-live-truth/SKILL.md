---
name: refactor-live-truth
description: "Use this skill whenever a claim about the system is about to drive an action — it forbids asserting any system fact from memory, README, docs, comments, or a remembered note without first verifying it against the live repo, config, or command output. Trigger phrases include \"the README says\", \"I remember that\", \"the docs claim\", \"it should be configured to\", \"tests live in\", or any moment where diagnose, understand, or verify is about to rely on a written description instead of the thing itself. A standing contract woven into the understand, diagnose, and verify phases of the refactor-chain pipeline — always on, repo-agnostic, advisory about claims but blocking about acting on unverified ones."
---

# Live Truth — the repo outranks everything written about it — refactor-chain · understand/verify

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** understand, diagnose, and verify — a standing contract, not a step of its own · **Prerequisite:** none · **Next:** whatever phase the verified fact feeds.
**Adaptivity / conditional:** repo-agnostic; always active whenever a system fact is about to be asserted or acted on.

## Purpose
Documentation describes the system as someone once believed it was. The repo IS the
system as it is right now. Those two drift apart the moment anyone edits anything, so
this skill enforces one rule everywhere: **never assert a system fact from memory,
docs, README, comments, or a recalled note — check the live source first.** Docs are
stale by default; treat every written claim as a hypothesis with a timestamp, and the
live repo, config file, or command output as the only witness that counts. Refactors
built on stale claims break real behavior while "matching the docs" perfectly.

## When to use
- Any time you are about to say "the config default is…", "tests live in…", "this
  module isn't imported anywhere", "the build uses…" — verify before the sentence ends.
- A README, comment, wiki page, or CHANGELOG makes a claim your next edit depends on.
- The chain's memory (`.refactor-chain/memory/sessions.jsonl`, boot banner) recalls a
  fact from a past session — recall is a hint, not a fact, until re-verified.
- During diagnose: before trusting a lane/classification hunch based on how the repo
  "usually" looks. During verify: before declaring success from what *should* have happened.

## What I'll tell you (plain-language / ADHD-friendly)
- "The README says the default port is 8080 — let me check the actual config before we rely on that. One second."
- "Checked: the code says 3000, the README is out of date. I'll trust the code and flag the README as a parked fix."
- "I remember from last session that tests lived in `test/` — but memory can be stale, so I verified: they moved to `src/__tests__/`. Good thing I looked."
- "I won't tell you 'nothing imports this module' from a comment — I ran the search just now, and two files import it."
- "Short version: I don't repeat claims, I re-check them. Say 'show technical details' for exactly what I ran to confirm."

## Method
1. **Catch the claim before it becomes an action.** Any statement of a system fact —
   defaults, paths, versions, wiring, "nothing uses X" — that came from docs, comments,
   memory, or your own recollection is a **claim**, not a fact. Name its source out loud.
2. **Pick the live witness** (the source-of-truth ladder in `references/method.md`):
   command output beats config files, config files beat code comments, and anything
   beats prose. Examples: a claimed default → read the config/code that sets it; a
   claimed file location → `ls`/glob it now; a claimed "unused" → grep imports now; a
   claimed behavior → run the command and read the output.
3. **Verify, then speak.** Only after the live check may the fact drive an edit, a plan
   line, or a verify verdict. Record what was checked (file + line, or command + output)
   so the write-up can cite it.
4. **On divergence, the repo wins.** When docs and repo disagree: act on the repo, and
   flag the stale doc as a parked item (the scope-fence discipline — never silently
   "fix the docs" mid-step). Fill `templates/output.md` with the claim, the witness,
   and the verdict.
5. **Memory recall is the same rule at session scale.** A boot-banner note ("run was
   paused at step 3") gets checked against `state.json` before resuming; a remembered
   parked item gets checked against the current code before acting. This is the recall
   discipline `refactor-memory` depends on.

Full ladder, claim taxonomy, and verification recipes per claim type: `references/method.md`.

## Guardrails
- **Advisory about claims, blocking about actions:** this skill edits nothing itself,
  but no edit, plan step, or verify verdict may rest on an unverified system claim.
- Verification must be **current** — a check from earlier in the session is stale the
  moment an edit could have changed its answer; re-check after relevant edits.
- Stale docs found along the way are **parked, not fixed** — scope-fence applies.
- Never present a confident guess as a check. "I didn't verify this" is always a
  legal sentence; a fabricated verification never is.

## Verify
- Plain: "Every system fact I acted on this step can be traced to something I looked at or ran *in this session*, not something I read about or remembered."
- Technical: for each load-bearing claim there is a named witness (file path + what it
  showed, or command + relevant output line); any docs/repo divergence is flagged in
  the step notes as a parked item; no verify verdict cites documentation as evidence.

## Resources
- `references/method.md` — the source-of-truth ladder, claim taxonomy, and per-type verification recipes.
- `examples/before-after.md` — worked example: a stale README default, trusted vs. verified.
- `scripts/checklist.mjs` — prints this skill's step checklist as JSON.
- `templates/output.md` — the claim-verification log scaffold.

## Chain position
A standing contract across **understand** (build the picture from the live repo, not
its brochure), **diagnose** (classification trusts signals actually detected, never
assumed), and **verify** (verdicts come from command output, never from expectation).
It underwrites `refactor-memory`'s recall rule and feeds `refactor-write-up` the cited
witnesses. `refactor-code-principles` + the review gate still run at the end of every lane.
