#!/usr/bin/env node
/**
 * refactor-review-gate — prints this gate's checklist as JSON.
 * Zero-dependency. Phase: review (the gate). Read-only.
 * The orchestrator appends this skill as the terminal kind:"gate" step of every
 * lane; the Stop hook (guard.mjs) blocks "done" until the gate passes.
 *
 * Usage:
 *   node scripts/checklist.mjs            # pretty JSON checklist
 *   node scripts/checklist.mjs --ids      # just the step ids, one per line
 */
const CHECKLIST = {
  skill: "refactor-review-gate",
  phase: "review",
  kind: "gate",
  prerequisite: "lane done + refactor-code-principles + green baseline",
  next: "docs → ship (only if the gate passes)",
  readOnly: true,
  editsCode: false,
  coordinates: ["refactor-security", "refactor-performance", "refactor-red-team"],
  absorbs: ["code-review:code-review", "review"],
  severities: ["Blocker", "Worth-fixing", "Optional"],
  decisions: ["go", "fix-these-first", "no-go"],
  rank_by: ["impact", "confidence"],
  steps: [
    { id: "warranted", title: "Confirm the gate is warranted (lane done, code-principles ran, baseline green) and capture the accumulated diff", done_when: "git diff vs lane-base captured; no-diff → trivial pass" },
    { id: "coordinate", title: "Invoke or consume refactor-security, refactor-performance, refactor-red-team against the same diff", done_when: "all three reviewers' findings collected; already-run reports consumed, not re-run" },
    { id: "correctness", title: "Do the gate's own correctness read (changed contracts, silent drift, ordering, lifecycle, logic slips, reuse)", done_when: "correctness findings captured with file:line + fix + confidence" },
    { id: "normalize", title: "Normalize all severities onto the shared Blocker/Worth-fixing/Optional scale", done_when: "every finding has a shared-scale severity" },
    { id: "dedupe", title: "Aggregate and de-dupe — merge same-line/same-cause findings, keep strongest severity, tag all sources", done_when: "no duplicate items; each merged item tagged with its sources" },
    { id: "rank", title: "Rank into ONE calm list: impact then confidence; behavior-change is a Blocker; long tail to appendix", done_when: "single ordered list; headline = the few that matter; nits appendixed" },
    { id: "assurances", title: "Surface the clean checks (good news) alongside the findings", done_when: "positive assurances listed" },
    { id: "decide", title: "Emit the go / fix-these-first / no-go decision and fill templates/output.md", done_when: "decision stated; report populated; Blockers → no-go + human handoff; nothing edited" },
  ],
};

if (process.argv.includes("--ids")) {
  process.stdout.write(CHECKLIST.steps.map((s) => s.id).join("\n") + "\n");
} else {
  process.stdout.write(JSON.stringify(CHECKLIST, null, 2) + "\n");
}
