#!/usr/bin/env node
/**
 * refactor-audit-trail — checklist + hash-chain helper. Zero deps (uses node:crypto).
 *   node checklist.mjs                 -> prints the step checklist as JSON
 *   node checklist.mjs --chain <file>  -> read a JSONL of entries and (re)compute the hash chain,
 *                                          reporting whether the existing chain is intact.
 *
 * Hash rule: entry.hash = sha256( canonical(entry-without-hash) + prevHash ). Genesis prevHash = "GENESIS".
 */
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const SKILL = "refactor-audit-trail";
const PHASE = "docs/ship";

const STEPS = [
  { id: 1, step: "gather", detail: "Read state.json (steps, verify, checkpoints, lastEdit) + git log/diff + artifacts-sync permission list." },
  { id: 2, step: "reconstruct-timeline", detail: "Order every change event chronologically: starts, checkpoints, edits, verifies, self-heals+rollbacks." },
  { id: 3, step: "entry-per-change", detail: "One entry per change with what / when / checkpoint / why + verify verdict." },
  { id: 4, step: "hash-link", detail: "prevHash = previous entry hash; hash = sha256(entry + prevHash). Genesis links to baseline." },
  { id: 5, step: "flag-sensitive", detail: "Mark entries touching permissions / auth / data for reviewer jump." },
  { id: 6, step: "emit", detail: "Write templates/output.md (human) + append machine form to .refactor-chain/audit-log.jsonl." },
];

const canonical = (o) => JSON.stringify(Object.keys(o).filter((k) => k !== "hash").sort().reduce((a, k) => (a[k] = o[k], a), {}));
const linkHash = (entry, prevHash) => createHash("sha256").update(canonical(entry) + prevHash).digest("hex");

function verifyChain(file) {
  if (!existsSync(file)) return { ok: false, reason: "no audit-log file", file };
  const entries = readFileSync(file, "utf8").trim().split("\n").filter(Boolean).map((l) => JSON.parse(l));
  let prev = "GENESIS", broken = null;
  const recomputed = entries.map((e, i) => {
    const h = linkHash(e, prev);
    if (e.hash && e.hash !== h && broken === null) broken = i;
    prev = h;
    return { i, when: e.when || null, what: e.what || null, hash: h, matches: e.hash ? e.hash === h : "unlinked" };
  });
  return { ok: broken === null, entries: entries.length, brokenAt: broken, chain: recomputed };
}

const argv = process.argv.slice(2);
const ci = argv.indexOf("--chain");
if (ci >= 0) {
  process.stdout.write(JSON.stringify({ skill: SKILL, ...verifyChain(argv[ci + 1]) }, null, 2) + "\n");
} else {
  process.stdout.write(JSON.stringify({ skill: SKILL, phase: PHASE, hashRule: "sha256(entry + prevHash), genesis prevHash=GENESIS", steps: STEPS }, null, 2) + "\n");
}
