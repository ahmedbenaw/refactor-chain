#!/usr/bin/env node
// refactor-backend-03-dao-model — step checklist as JSON (zero dependencies).
// Usage: node checklist.mjs [--pretty]

const checklist = {
  skill: "refactor-backend-03-dao-model",
  lane: "backend",
  step: "03/09",
  prerequisite: "refactor-backend-02-module-rename",
  next: "refactor-backend-04-service",
  classification: "filename + directory position only; file contents are never read to classify",
  rules: [
    { id: "D-1", check: "imp -> impl naming, including compound variants (serviceImp/, daoImp/)", severity: "FAIL" },
    { id: "D-2", check: "impls under dao/impl/, interfaces at dao/ root", severity: "FAIL/WARN" },
    { id: "D-3", check: "*Mapper.java under dao/mapper/, *Entity.java under dao/entity/", severity: "FAIL/WARN" },
    { id: "D-4", check: "four-layer completeness (present files have their sub-dirs)", severity: "WARN" },
    { id: "D-5", check: "mapper XML resource path corresponds to its mapper package", severity: "WARN" },
    { id: "D-6", check: "model classes consolidated into the shared model module", severity: "WARN/INFO" },
    { id: "D-7", check: "self-contained mini-domain detected and exempted", severity: "INFO" }
  ],
  steps: [
    { n: 1, phase: "scope", do: "walk up parent build files to the topmost in-repo one; that dir is the fixed search root (exclude target/build/.git)" },
    { n: 2, phase: "exempt", do: "flag self-contained mini-domains (>=2 of entity|model / mapper|dao / service, not a standard layer dir, not nested config) as INFO; skip them" },
    { n: 3, phase: "check", do: "evaluate D-1..D-7 by filename + position; emit the FAIL/WARN/INFO report; stop here in check mode" },
    { n: 4, phase: "fix:plan", do: "idempotency pre-check, then enumerate every dir rename, file move, and created dir" },
    { n: 5, phase: "fix:confirm", do: "obtain explicit user confirmation before any change" },
    { n: 6, phase: "fix:execute", do: "fixed order: (a) imp->impl, (b) DAO relocation per the table, (c) mapper/entity separation via three-state pre-check, (d) model consolidation with byte-identical packages, (e) create missing dirs (dirs only)" },
    { n: 7, phase: "fix:move", do: "per file: read -> destination conflict pre-check -> create -> verify -> delete original (three-way conflict policy)" },
    { n: 8, phase: "verify", do: "V1 no imp residue, V2 DAO placement, V3 mapper/entity split, V4 model centralized, V5 model package diff empty; then compile" },
    { n: 9, phase: "handoff", do: "re-run check for idempotence; run chain verify gate; advance to step 04" }
  ],
  invariants: [
    "behavior preserved: only file locations, package lines, and forced import lines change",
    "model consolidation is compile-neutral: package declarations stay byte-identical, zero imports change",
    "classification is deterministic: filename + position only, same tree => same result",
    "no build-file dependency edits; no new services or interfaces invented; no business logic touched",
    "no move executes without user confirmation; a moved original is deleted only after its copy verifies",
    "file encodings (incl. BOM) preserved on move"
  ]
};

const pretty = process.argv.includes("--pretty");
process.stdout.write(JSON.stringify(checklist, null, pretty ? 2 : 0) + "\n");
