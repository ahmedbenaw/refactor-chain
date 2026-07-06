#!/usr/bin/env node
/**
 * refactor-simplify — prints the four-lens simplification checklist as JSON.
 * Zero-dependency. Phase: do-the-work (cleanup) / review (polish).
 * Quality only — preserves behavior EXACTLY, does NOT hunt for bugs.
 * Every step is proven against the refactor-safety-net baseline via refactor-verify.
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-simplify",
  phase: "do-the-work / review",
  prerequisite: "green baseline (refactor-safety-net)",
  next: "refactor-verify proves behavior held → refactor-review-gate",
  editsCode: true,
  behaviorPreserving: true,
  bugHunt: false,
  absorbs: ["simplify"],
  lenses: {
    reuse: "duplicated logic / reinvented wheels → reuse the existing thing",
    "dead-code": "unreachable branches, unused exports/params/vars, commented blocks",
    altitude: "collapse needless layers (over-abstraction) OR add the one missing seam (under-abstraction)",
    clarity: "intent-revealing names, flatten nesting, split two-job functions, top-to-bottom flow",
  },
  outOfLane: ["correctness bugs", "security issues", "performance regressions"],
  outOfLaneRule: "note and leave for refactor-review-gate / refactor-security / refactor-performance — never fix here",
  steps: [
    { id: "baseline", title: "Confirm the baseline is green (else get one via refactor-safety-net)", done_when: "orchestrate status shows baseline:true" },
    { id: "scan", title: "Scan the changed code through the four lenses (reuse / dead-code / altitude / clarity)", done_when: "each candidate tagged with a lens and passing the in-lane test" },
    { id: "apply", title: "Apply each simplification as one small, reversible step (type-aware rename where relevant)", done_when: "one transformation per step; nothing bundled" },
    { id: "verify", title: "Re-run the baseline after every step; identical pass-set → keep, any drift → undo that step", done_when: "behavior identical after each step; drift undone immediately" },
    { id: "gate-big-moves", title: "Ask before big moves (layer merges, public-contract reshapes); proceed on small local wins", done_when: "large reshapes offered as one-line choices; small wins proceed" },
    { id: "report", title: "Report what got simpler AND what you left untouched (out-of-lane notes to the reviewers)", done_when: "templates/output.md filled; out-of-lane observations listed as notes, not changes" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
