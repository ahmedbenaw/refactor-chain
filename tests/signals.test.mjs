/**
 * refactor-chain — languages registry test suite. Imports the registry
 * directly (no subprocess): schema invariants for every entry, detection
 * from constructed name-sets, and test-framework resolution evidence rules.
 * Run: node tests/signals.test.mjs
 */
import { LANGUAGES, detectLanguages, resolveTestFramework } from "../scripts/lib/languages.mjs";

let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };

// ---- schema: every LANGUAGES entry is well-formed ----
const FAMILIES = new Set(["systems", "jvm", "beam", "js", "dotnet", "apple", "dart", "scripting", "functional", "logic", "legacy", "data", "infra", "sci"]);
const LANES = new Set(["code", "web", "ui", "backend"]);
const ids = new Set();
for (const L of LANGUAGES) {
  const problems = [];
  if (typeof L.id !== "string" || !L.id) problems.push("id");
  if (ids.has(L.id)) problems.push("duplicate id"); ids.add(L.id);
  if (!FAMILIES.has(L.family)) problems.push(`family=${L.family}`);
  if (!L.detect || !Array.isArray(L.detect.manifests) || !Array.isArray(L.detect.exts) || !Array.isArray(L.detect.markers)) problems.push("detect shape");
  if (L.detect && !(L.detect.manifests.length || L.detect.exts.length || L.detect.markers.length)) problems.push("detect empty (undetectable)");
  if (!Array.isArray(L.test) || L.test.length === 0 || L.test.some((x) => typeof x.framework !== "string" || typeof x.cmd !== "string")) problems.push("test candidates");
  if (!LANES.has(L.lane)) problems.push(`lane=${L.lane}`);
  t(`schema: ${L.id || "(missing id)"}`, problems.length === 0, problems);
}
t("registry has a healthy breadth (≥ 30 languages)", LANGUAGES.length >= 30, LANGUAGES.length);

// ---- detectLanguages from constructed name-sets ----
const found = (names, deps, exts) => detectLanguages(new Set(names), deps || {}, new Set(exts || [])).map((h) => h.id);

let ids2 = found(["mix.exs"], {}, [".ex"]);
t("detects elixir (mix.exs + .ex)", ids2.includes("elixir"), ids2);
ids2 = found(["Cargo.toml"], {}, [".rs"]);
t("detects rust (Cargo.toml)", ids2.includes("rust"), ids2);
ids2 = found(["alire.toml"], {}, [".adb"]);
t("detects ada (alire.toml + .adb)", ids2.includes("ada"), ids2);
ids2 = found([], {}, [".cbl"]);
t("detects cobol from .cbl extension alone", ids2.includes("cobol"), ids2);
ids2 = found([], {}, [".xyz-nope"]);
t("no false positives on unknown extensions", ids2.length === 0, ids2);
// hit metadata shape
const hits = detectLanguages(new Set(["mix.exs"]), {}, new Set());
t("hit carries id/family/lane/platform/byManifest", hits[0]?.id === "elixir" && hits[0].family === "beam" && hits[0].lane === "code" && hits[0].platform === "backend" && hits[0].byManifest === true, hits[0]);
// matlab/objc collision resolution: .m + Podfile drops the matlab ext-hit
ids2 = found(["Podfile"], {}, [".m"]);
t("matlab .m collision resolved toward objective-c when Podfile present", ids2.includes("objective-c") && !ids2.includes("matlab"), ids2);

// ---- resolveTestFramework: evidence semantics ----
// full plan-list coverage: every named language resolves to an id or a variant (case-insensitive)
{
  const ids = new Set(LANGUAGES.map((l) => l.id));
  const vars = new Set(LANGUAGES.flatMap((l) => (l.variants || []).map((v) => v.toLowerCase())));
  for (const n of ["javascript","typescript","bun","deno","webassembly","java","kotlin","scala","erlang","elixir",
                   "c","cpp","rust","zig","ada","csharp","basic","delphi","swift","objective-c","dart","python",
                   "ruby","php","perl","lua","shell","curl","r","matlab","haskell","ocaml","caml","lisp","prolog",
                   "wolfram","cobol","fortran","sql","nix","go"])
    t(`plan language covered: ${n}`, ids.has(n) || vars.has(n) || vars.has(n.replace("-", " ")), n);
}

let r = resolveTestFramework(["java"], new Set(["pom.xml"]), {});
t("needs-satisfied (java+pom.xml) → maven, evidence:true", r?.framework === "maven" && r.cmd === "mvn test" && r.evidence === true, r);
r = resolveTestFramework(["javascript"], new Set(), { vitest: "^1" });
t("needs via deps (vitest) → evidence:true", r?.framework === "vitest" && r.evidence === true, r);
r = resolveTestFramework(["elixir"], new Set(), {});
t("bare fallback (mix, no needs) → evidence:false", r?.framework === "mix" && r.cmd === "mix test" && r.evidence === false, r);
r = resolveTestFramework(["javascript"], new Set(), {});
t("js without vitest/jest falls back to node-test, evidence:false", r?.framework === "node-test" && r.evidence === false, r);
r = resolveTestFramework(["not-a-language"], new Set(), {});
t("unknown language id → null", r === null, r);

console.log(`\n${fail === 0 ? "✅" : "❌"} signals/languages: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
