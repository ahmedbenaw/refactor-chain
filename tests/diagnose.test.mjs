/**
 * refactor-chain — diagnose.mjs test suite. Portable + self-contained:
 * builds its own fixtures in a temp dir, resolves the engine relative to this
 * file. Run: node tests/diagnose.test.mjs
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";

const HERE = dirname(fileURLToPath(import.meta.url));
const D = join(HERE, "..", "scripts", "diagnose.mjs");
const ST = mkdtempSync(join(tmpdir(), "rc-test-"));

// ---- fixtures ----
const fx = (name, files) => {
  const dir = join(ST, name);
  for (const [rel, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, rel)), { recursive: true });
    writeFileSync(join(dir, rel), content);
  }
};
fx("java", { "pom.xml": "<project><groupId>grp.pt.demo</groupId></project>" });
fx("vue", { "package.json": '{"name":"v","version":"3.7.0-SNAPSHOT","dependencies":{"vue":"^3"},"devDependencies":{"vitest":"^1"}}', "vite.config.ts": "x" });
fx("react", { "package.json": '{"name":"r","version":"1.4.0","dependencies":{"react":"^18","next":"^14"},"devDependencies":{"jest":"^29"}}', "next.config.mjs": "x", "tailwind.config.ts": "x" });
fx("ios", { "App.xcodeproj": "x", "Info.plist": "x" });
fx("android", { "AndroidManifest.xml": "x", "build.gradle": "apply plugin" });
fx("monorepo", { "package.json": '{"name":"root","workspaces":["pkg-a","pkg-b"]}', "pkg-a/pom.xml": "<project><groupId>grp.budget</groupId></project>", "pkg-b/package.json": '{"name":"b","dependencies":{"react":"^18"}}' });
fx("notests", { "package.json": '{"name":"nt","version":"1.0.0","dependencies":{"express":"^4"}}' });
fx("cli", { "index.js": "#!/usr/bin/env node\n", "Makefile": "all:\n\techo hi" });
// v3 additions
fx("gradleback", { "build.gradle": "plugins { id 'java' }\n", "src/main/java/App.java": "class App {}" });
fx("c-cmake", { "CMakeLists.txt": "project(demo C)\n", "src/main.c": "int main(void){return 0;}", "src/util.h": "#pragma once" });
fx("elixir", { "mix.exs": "defmodule Demo.MixProject do end\n", "lib/demo.ex": "defmodule Demo do end" });
fx("erlang", { "rebar.config": "{erl_opts, []}.\n", "src/demo.erl": "-module(demo)." });
fx("ada", { "alire.toml": 'name = "demo"\n', "src/demo.adb": "procedure Demo is begin null; end Demo;" });
fx("cobol", { "main.cbl": "IDENTIFICATION DIVISION.\nPROGRAM-ID. MAIN.\n" });
fx("embedded", { "platformio.ini": "[env:uno]\nplatform = atmelavr\n", "src/main.c": "int main(void){return 0;}" });
fx("speckit", { ".specify/spec.md": "# spec", "package.json": '{"name":"sk","dependencies":{"react":"^18"}}' });

const classify = (dir, utterance, mode) => {
  const args = [D, "classify", "--target", join(ST, dir)];
  if (utterance) args.push("--utterance", utterance);
  if (mode) args.push("--mode", mode);
  return JSON.parse(execFileSync(process.execPath, args).toString());
};
let pass = 0, fail = 0;
const t = (name, cond, got) => { if (cond) { pass++; } else { fail++; console.log(`  ✗ ${name}  got: ${JSON.stringify(got)}`); } };
const langsOf = (r) => ((r.signals.find((s) => s.startsWith("languages:")) || "languages:").slice("languages:".length)).split(",").filter(Boolean);

let r;
// ---- ported v2 suite ----
r = classify("java"); t("java project→backend lane", r.lane === "backend" && r.inScope, r.lane);
r = classify("vue", "make it look nicer", "careful"); t("vue+nicer→ui", r.lane === "ui", { lane: r.lane, conf: r.confidence });
r = classify("react"); t("react→web", r.lane === "web", r.lane);
r = classify("ios"); t("ios→ui/mobile, no spurious clarify", r.lane === "ui" && r.platform === "mobile" && !r.clarify, { lane: r.lane, plat: r.platform, clarify: !!r.clarify });
r = classify("android"); t("android→ui/mobile", r.lane === "ui" && r.os === "android", { lane: r.lane, os: r.os });
r = classify("monorepo", "", "careful"); t("monorepo→clarify + capped conf", r.monorepo && r.clarify && r.confidence <= 0.55, { mono: r.monorepo, clarify: !!r.clarify, conf: r.confidence });
r = classify("notests", "the page is really slow"); t("slow→debug/web-performance", r.lane === "debug" && r.case === "web-performance", { lane: r.lane, case: r.case });
r = classify("notests", "memory keeps growing"); t("memory→debug/code-memory", r.case === "code-memory", r.case);
r = classify("notests", "add a login page"); t("add feature→out of scope + redirect", !r.inScope && r.redirect, { inScope: r.inScope, redirect: !!r.redirect });
r = classify("cli", "refactor this"); t("cli+refactor→code", r.lane === "code", r.lane);
r = classify("notests"); t("notests flagged no-tests", r.signals.includes("no-tests"), r.signals);

// ---- v3 additions ----
r = classify("gradleback"); t("gradle backend→backend lane", r.lane === "backend" && r.inScope, { lane: r.lane });
r = classify("android"); t("android (manifest+gradle)→ui lane", r.lane === "ui", { lane: r.lane });
r = classify("c-cmake"); t("c-cmake→code + languages:c", r.lane === "code" && langsOf(r).includes("c"), { lane: r.lane, langs: langsOf(r) });
r = classify("elixir"); t("elixir-mix→code + languages:elixir", r.lane === "code" && langsOf(r).includes("elixir"), { lane: r.lane, langs: langsOf(r) });
r = classify("erlang"); t("erlang-rebar→code + languages:erlang", r.lane === "code" && langsOf(r).includes("erlang"), { lane: r.lane, langs: langsOf(r) });
r = classify("ada"); t("ada (alire+.adb)→code + languages:ada", r.lane === "code" && langsOf(r).includes("ada"), { lane: r.lane, langs: langsOf(r) });
r = classify("cobol"); t("cobol (.cbl)→code + languages:cobol", r.lane === "code" && langsOf(r).includes("cobol"), { lane: r.lane, langs: langsOf(r) });
r = classify("embedded"); t("platformio→platform embedded + host-test note", r.platform === "embedded" && typeof r.note === "string" && r.note.length > 0, { plat: r.platform, note: r.note });

r = classify("speckit");
t("spec-kit (.specify)→conditional.specKit true", r.conditional.specKit === true, r.conditional);
t("spec-kit→plain-language interop note", typeof r.note === "string" && r.note.includes("Integrate"), r.note);
r = classify("java");
t("classify carries native principle recommendation", Array.isArray(r.principles?.agnostic) && r.principles.agnostic.includes("solid") && r.principles.stackMapped.includes("ddd-tactical"), r.principles);

rmSync(ST, { recursive: true, force: true });
console.log(`\n${fail === 0 ? "✅" : "❌"} diagnose: ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
