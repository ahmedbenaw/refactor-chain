#!/usr/bin/env node
/**
 * refactor-adversarial-verify — prints this skill's step checklist as JSON.
 * Zero-dependency. Usage:
 *   node checklist.mjs            # pretty JSON
 *   node checklist.mjs --compact  # single-line JSON
 */
const checklist = {
  skill: "refactor-adversarial-verify",
  phase: "verify (inside every lane step, before advance --delta legal; again at the review gate)",
  prerequisite: "step edits complete + refactor-verify pass-set comparison in hand",
  next: "survived → orchestrate.mjs advance --delta legal; fell → fix/rollback, re-verify, re-attack",
  gate: "no survived attack log → no advance --delta legal",
  protocol: "refactor-chain/references/reasoning-protocol.md — number claims/attacks; landed attacks revise the numbered claim explicitly",
  steps: [
    { id: 1, title: "State the claim", do: "One falsifiable present-tense sentence of what 'done' means, inheriting the plan's success criteria + 'pass-set identical to baseline'.", gate: "Claim is precise enough to attack; if not, shrink the step." },
    { id: 2, title: "Attack A — wrong-assumption", do: "List what was taken on faith (caller completeness, environment, docs/memory, framework wiring, test surface); verify each against the LIVE repo/output, never memory.", gate: "Each assumption has named evidence, or the attack lands." },
    { id: 3, title: "Attack B — edge-case", do: "Hunt ignored inputs/states/timing (empty/null/huge, first/last, called-twice, concurrency, old-name residue); trace the TWO most plausible through the changed code or execute them.", gate: "Both traces hold, or the attack lands." },
    { id: 4, title: "Attack C — does-it-actually-run", do: "Demand execution evidence for every changed path: baseline coverage that reaches it, or a direct run. 'It compiles / looks right' is not evidence.", gate: "Every changed path has execution evidence, or the attack lands." },
    { id: 5, title: "Verdict + harness signal", do: "Survived: record attack log, advance --delta legal --note 'adversarial-verify: survived 3/3'. Fell: no advance — fix or roll back, re-run refactor-verify, RE-ATTACK all three angles; repeated falls → fail --reason.", gate: "advance --delta legal only ever follows a survived verdict." },
    { id: 6, title: "Review gate pass", do: "Same protocol over the whole diff; the claim is the plan's success criteria verbatim.", gate: "Gate sign-off carries a whole-diff attack log." },
  ],
  surviveRules: [
    "All three attacks attempted in earnest, each with named evidence (command run / file read / trace).",
    "An empty attack states what was searched before coming up empty.",
    "Any one landed attack = fell; fixes invalidate the previous log — re-attack in full.",
    "Post-self-heal attempts get a full fresh attack; no carried-over credit.",
  ],
  guardrails: [
    "Blocking over advancement, advisory over reasoning — this skill edits no code itself.",
    "No straw-man attacks; each names a concrete, checkable failure story.",
    "Never weaken the claim to survive; shrink the step honestly via the harness instead.",
    "A landed attack is a process SUCCESS — log it without spin.",
  ],
};
const compact = process.argv.includes("--compact");
process.stdout.write(JSON.stringify(checklist, null, compact ? 0 : 2) + "\n");
