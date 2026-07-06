/**
 * refactor-chain — universal language taxonomy (registry-driven detection).
 * Adding a language/framework is a DATA edit here, not code. Consumed by
 * signals.mjs (detection + test-framework resolution) and diagnose.mjs
 * (lane routing). Classified: family → language → variants → frameworks.
 *
 * Schema per entry:
 *   id        stable key
 *   family    systems|jvm|beam|js|dotnet|apple|dart|scripting|functional|logic|legacy|data|infra|sci
 *   variants  notable dialects/runtimes grouped under the language
 *   frameworks major frameworks (detection markers where distinctive)
 *   detect    { manifests:[filenames], exts:[extensions], markers:[dep-or-path hints] }
 *   test      ordered candidates: { framework, cmd, needs? (manifest/dep hint) }
 *   lane      default lane routing (code|web|ui) — framework hints may override in diagnose
 *   platform  hint: backend|web|mobile|desktop|cli|embedded|data|any
 *   depth     "deep" = idiomatic guidance exists in code-principles refs; "core" = detect/route/baseline
 */
export const LANGUAGES = [
  // ── JS/TS ecosystem ──────────────────────────────────────────────────────
  { id: "javascript", family: "js", variants: ["ESM", "CJS", "Node", "Bun", "Deno"],
    frameworks: ["React", "Vue", "Svelte", "Angular", "jQuery", "Express", "Next.js", "Nuxt", "Astro", "Remix", "Fastify", "NestJS"],
    detect: { manifests: ["package.json"], exts: [".js", ".mjs", ".cjs", ".jsx"], markers: [] },
    test: [{ framework: "vitest", cmd: "npx vitest run", needs: "vitest" }, { framework: "jest", cmd: "npx jest", needs: "jest" },
           { framework: "node-test", cmd: "node --test" }],
    lane: "web", platform: "web", depth: "deep" },
  { id: "typescript", family: "js", variants: ["tsc", "ts-node", "Bun", "Deno"], frameworks: ["same as JavaScript"],
    detect: { manifests: ["tsconfig.json"], exts: [".ts", ".tsx"], markers: ["typescript"] },
    test: [{ framework: "vitest", cmd: "npx vitest run", needs: "vitest" }, { framework: "jest", cmd: "npx jest", needs: "jest" }],
    lane: "web", platform: "web", depth: "deep" },
  { id: "bun", family: "js", variants: [], frameworks: ["Elysia", "Hono"],
    detect: { manifests: ["bun.lockb", "bunfig.toml"], exts: [], markers: [] },
    test: [{ framework: "bun-test", cmd: "bun test" }], lane: "web", platform: "web", depth: "core" },
  { id: "webassembly", family: "js", variants: ["wasm32", "WASI"], frameworks: ["wasm-pack", "Emscripten", "wasm-bindgen"],
    detect: { manifests: [], exts: [".wat", ".wasm"], markers: ["wasm-pack", "emscripten"] },
    test: [{ framework: "host-harness", cmd: "run the host language's tests" }], lane: "code", platform: "any", depth: "core" },
  // ── JVM ──────────────────────────────────────────────────────────────────
  { id: "java", family: "jvm", variants: ["Java SE", "Jakarta EE", "Android"],
    frameworks: ["Spring", "Spring Boot", "Quarkus", "Micronaut", "Jakarta EE", "Android SDK"],
    detect: { manifests: ["pom.xml", "build.gradle", "build.gradle.kts"], exts: [".java"], markers: [] },
    test: [{ framework: "maven", cmd: "mvn test", needs: "pom.xml" }, { framework: "gradle", cmd: "gradle test", needs: "build.gradle" }],
    lane: "backend", platform: "backend", depth: "deep" },
  { id: "kotlin", family: "jvm", variants: ["JVM", "Android", "Multiplatform"], frameworks: ["Ktor", "Compose", "Spring"],
    detect: { manifests: ["build.gradle.kts"], exts: [".kt", ".kts"], markers: [] },
    test: [{ framework: "gradle", cmd: "gradle test" }], lane: "backend", platform: "backend", depth: "core" },
  { id: "scala", family: "jvm", variants: ["Scala 2", "Scala 3"], frameworks: ["Akka/Pekko", "Play", "ZIO", "Cats"],
    detect: { manifests: ["build.sbt"], exts: [".scala", ".sc"], markers: [] },
    test: [{ framework: "sbt", cmd: "sbt test" }], lane: "backend", platform: "backend", depth: "core" },
  // ── BEAM ─────────────────────────────────────────────────────────────────
  { id: "erlang", family: "beam", variants: ["OTP"], frameworks: ["OTP", "rebar3", "erlang.mk", "Cowboy"],
    detect: { manifests: ["rebar.config", "erlang.mk"], exts: [".erl", ".hrl"], markers: [".app.src"] },
    test: [{ framework: "rebar3-eunit", cmd: "rebar3 eunit" }, { framework: "rebar3-ct", cmd: "rebar3 ct" }],
    lane: "code", platform: "backend", depth: "deep" },
  { id: "elixir", family: "beam", variants: [], frameworks: ["Phoenix", "Ecto", "Nerves", "LiveView", "Oban"],
    detect: { manifests: ["mix.exs"], exts: [".ex", ".exs"], markers: [] },
    test: [{ framework: "mix", cmd: "mix test" }], lane: "code", platform: "backend", depth: "deep" },
  // ── Systems ──────────────────────────────────────────────────────────────
  { id: "c", family: "systems", variants: ["C89", "C99", "C11", "C17", "embedded C"], frameworks: ["Make", "CMake", "Meson", "Autotools"],
    detect: { manifests: ["CMakeLists.txt", "meson.build", "configure.ac"], exts: [".c", ".h"], markers: [] },
    test: [{ framework: "ctest", cmd: "ctest --test-dir build", needs: "CMakeLists.txt" }, { framework: "make-check", cmd: "make check" }],
    lane: "code", platform: "backend", depth: "deep" },
  { id: "cpp", family: "systems", variants: ["C++11..26"], frameworks: ["CMake", "Meson", "Conan", "vcpkg", "Qt", "Boost", "GoogleTest", "Catch2"],
    detect: { manifests: ["CMakeLists.txt", "meson.build", "conanfile.txt", "conanfile.py", "vcpkg.json"], exts: [".cpp", ".cc", ".cxx", ".hpp", ".hh"], markers: [] },
    test: [{ framework: "ctest", cmd: "ctest --test-dir build" }, { framework: "make-check", cmd: "make check" }],
    lane: "code", platform: "backend", depth: "deep" },
  { id: "rust", family: "systems", variants: [], frameworks: ["Cargo", "Tokio", "Axum", "Actix", "Bevy", "Tauri"],
    detect: { manifests: ["Cargo.toml"], exts: [".rs"], markers: [] },
    test: [{ framework: "cargo", cmd: "cargo test" }], lane: "code", platform: "backend", depth: "deep" },
  { id: "zig", family: "systems", variants: [], frameworks: ["zig build"],
    detect: { manifests: ["build.zig"], exts: [".zig"], markers: [] },
    test: [{ framework: "zig-test", cmd: "zig build test" }], lane: "code", platform: "backend", depth: "core" },
  { id: "ada", family: "systems", variants: ["Ada 83..2022", "SPARK", "Ravenscar profile"],
    frameworks: ["GNAT", "gprbuild", "AUnit", "AWS (Ada Web Server)", "Alire"],
    detect: { manifests: ["alire.toml"], exts: [".adb", ".ads", ".gpr"], markers: [] },
    test: [{ framework: "gnattest", cmd: "gprbuild -P tests && ./test_runner" }, { framework: "alr", cmd: "alr test", needs: "alire.toml" }],
    lane: "code", platform: "backend", depth: "core",
    notes: "SPARK variant pairs with Design-by-Contract + proof (gnatprove) — see principles registry" },
  { id: "go", family: "systems", variants: [], frameworks: ["net/http", "Gin", "Echo", "Fiber", "Cobra"],
    detect: { manifests: ["go.mod"], exts: [".go"], markers: [] },
    test: [{ framework: "gotest", cmd: "go test ./..." }], lane: "code", platform: "backend", depth: "deep" },
  // ── .NET / Windows heritage ─────────────────────────────────────────────
  { id: "csharp", family: "dotnet", variants: [".NET Framework (Windows)", "modern .NET (cross-platform)", "Unity", "Mono"],
    frameworks: ["ASP.NET Core", "WPF", "WinForms", "MAUI", "Blazor", "Unity", "xUnit", "NUnit", "MSTest"],
    detect: { manifests: [], exts: [".cs", ".csproj", ".sln"], markers: [] },
    test: [{ framework: "dotnet", cmd: "dotnet test" }], lane: "backend", platform: "backend", depth: "deep" },
  { id: "basic", family: "dotnet", variants: ["VB.NET", "VBA", "classic BASIC"], frameworks: [".NET", "Office VBA"],
    detect: { manifests: [], exts: [".vb", ".bas", ".vba"], markers: [] },
    test: [{ framework: "dotnet", cmd: "dotnet test" }], lane: "code", platform: "backend", depth: "core" },
  { id: "delphi", family: "dotnet", variants: ["Delphi", "Object Pascal", "Pascal", "Pascal Script", "Free Pascal/Lazarus"],
    frameworks: ["VCL", "FireMonkey", "Lazarus LCL"],
    detect: { manifests: [], exts: [".dpr", ".dproj", ".lpr", ".lpi", ".pas"], markers: [] },
    test: [{ framework: "dunit", cmd: "run the project's DUnit/FPCUnit suite" }], lane: "code", platform: "desktop", depth: "core" },
  { id: "pascal", family: "dotnet", variants: ["Delphi", "Object Pascal", "Free Pascal", "Pascal Script", "Turbo Pascal"],
    frameworks: ["Delphi VCL", "FireMonkey", "Lazarus/LCL"],
    detect: { manifests: [], exts: [".pas", ".dpr", ".dproj", ".lpr", ".lpi", ".pp"], markers: [] },
    test: [{ framework: "dunit", cmd: "run the DUnit/FPCUnit test project" }], lane: "code", platform: "desktop", depth: "core" },
  // ── Apple / mobile ──────────────────────────────────────────────────────
  { id: "swift", family: "apple", variants: ["iOS", "macOS", "server-side"], frameworks: ["SwiftUI", "UIKit", "Vapor", "SPM", "XCTest"],
    detect: { manifests: ["Package.swift"], exts: [".swift"], markers: [".xcodeproj", "Podfile"] },
    test: [{ framework: "swift-test", cmd: "swift test", needs: "Package.swift" }, { framework: "xcodebuild", cmd: "xcodebuild test" }],
    lane: "code", platform: "mobile", depth: "deep" },
  { id: "objective-c", family: "apple", variants: ["Objective-C++"], frameworks: ["Cocoa", "UIKit", "CocoaPods"],
    detect: { manifests: ["Podfile"], exts: [".m", ".mm"], markers: [".xcodeproj"] },
    test: [{ framework: "xcodebuild", cmd: "xcodebuild test" }], lane: "code", platform: "mobile", depth: "core" },
  { id: "dart", family: "dart", variants: [], frameworks: ["Flutter", "AngularDart", "Serverpod", "shelf"],
    detect: { manifests: ["pubspec.yaml"], exts: [".dart"], markers: [] },
    test: [{ framework: "flutter-test", cmd: "flutter test", needs: "flutter" }, { framework: "dart-test", cmd: "dart test" }],
    lane: "ui", platform: "mobile", depth: "deep" },
  // ── Scripting ───────────────────────────────────────────────────────────
  { id: "python", family: "scripting", variants: ["CPython", "PyPy", "MicroPython"],
    frameworks: ["Django", "Flask", "FastAPI", "pytest", "poetry", "uv", "NumPy/pandas"],
    detect: { manifests: ["pyproject.toml", "requirements.txt", "Pipfile", "setup.py"], exts: [".py"], markers: [] },
    test: [{ framework: "pytest", cmd: "pytest" }, { framework: "unittest", cmd: "python -m unittest" }],
    lane: "code", platform: "backend", depth: "deep" },
  { id: "ruby", family: "scripting", variants: [], frameworks: ["Rails", "Sinatra", "RSpec", "Minitest"],
    detect: { manifests: ["Gemfile"], exts: [".rb"], markers: [] },
    test: [{ framework: "rspec", cmd: "bundle exec rspec", needs: "rspec" }, { framework: "minitest", cmd: "bundle exec rake test" }],
    lane: "code", platform: "backend", depth: "deep" },
  { id: "php", family: "scripting", variants: [], frameworks: ["Laravel", "Symfony", "WordPress", "PHPUnit"],
    detect: { manifests: ["composer.json"], exts: [".php"], markers: [] },
    test: [{ framework: "phpunit", cmd: "vendor/bin/phpunit" }], lane: "code", platform: "backend", depth: "deep" },
  { id: "perl", family: "scripting", variants: ["Perl 5", "Raku"], frameworks: ["CPAN", "Mojolicious", "Test::More"],
    detect: { manifests: ["cpanfile", "Makefile.PL"], exts: [".pl", ".pm", ".raku"], markers: [] },
    test: [{ framework: "prove", cmd: "prove -l t/" }], lane: "code", platform: "backend", depth: "core" },
  { id: "lua", family: "scripting", variants: ["Lua 5.x", "LuaJIT"], frameworks: ["LuaRocks", "LÖVE", "OpenResty", "Neovim plugins", "busted"],
    detect: { manifests: [".luarc.json", "rockspec"], exts: [".lua"], markers: [] },
    test: [{ framework: "busted", cmd: "busted" }], lane: "code", platform: "backend", depth: "core" },
  { id: "shell", family: "scripting", variants: ["bash", "zsh", "POSIX sh", "fish"], frameworks: ["bats-core", "shellcheck"],
    detect: { manifests: [], exts: [".sh", ".bash", ".zsh"], markers: ["#!/bin/sh", "#!/bin/bash"] },
    test: [{ framework: "bats", cmd: "bats test/" }, { framework: "shellcheck", cmd: "shellcheck *.sh" }],
    lane: "code", platform: "cli", depth: "core" },
  { id: "curl", family: "scripting", variants: ["curl scripts", "HTTP request collections"], frameworks: ["hurl", "httpie collections"],
    detect: { manifests: [], exts: [".curl", ".hurl"], markers: ["curl -"] },
    test: [{ framework: "hurl", cmd: "hurl --test" }], lane: "code", platform: "cli", depth: "core" },
  { id: "curl-scripts", family: "scripting", variants: [], frameworks: ["HTTP request collections (.http/.rest)", "httpyac"],
    detect: { manifests: [], exts: [".http", ".rest"], markers: [] }, // .hurl belongs to the `curl` entry above (was double-registered)
    test: [{ framework: "httpyac", cmd: "httpyac send *.http" }], lane: "code", platform: "cli", depth: "core" },
  { id: "r", family: "sci", variants: [], frameworks: ["tidyverse", "Shiny", "testthat", "renv"],
    detect: { manifests: ["DESCRIPTION", "renv.lock"], exts: [".R", ".Rmd"], markers: [] },
    test: [{ framework: "testthat", cmd: "Rscript -e 'testthat::test_dir(\"tests\")'" }],
    lane: "code", platform: "data", depth: "core" },
  { id: "matlab", family: "sci", variants: ["Octave-compatible"], frameworks: ["Simulink", "MATLAB unittest"],
    detect: { manifests: [], exts: [".m", ".mlx", ".slx"], markers: [] },
    test: [{ framework: "matlab-unittest", cmd: "matlab -batch \"runtests\"" }], lane: "code", platform: "data", depth: "core",
    notes: ".m collides with Objective-C — resolved by sibling signals (xcodeproj ⇒ objc)" },
  { id: "wolfram", family: "sci", variants: ["Mathematica"], frameworks: ["Wolfram Language paclets"],
    detect: { manifests: ["PacletInfo.wl"], exts: [".wl", ".nb", ".wls"], markers: [] },
    test: [{ framework: "wolfram-test", cmd: "wolframscript -f tests.wls" }], lane: "code", platform: "data", depth: "core" },
  // ── Functional / logic ──────────────────────────────────────────────────
  { id: "haskell", family: "functional", variants: ["GHC"], frameworks: ["cabal", "stack", "Hspec", "QuickCheck"],
    detect: { manifests: ["stack.yaml", "cabal.project"], exts: [".hs", ".lhs", ".cabal"], markers: [] },
    test: [{ framework: "stack", cmd: "stack test", needs: "stack.yaml" }, { framework: "cabal", cmd: "cabal test" }],
    lane: "code", platform: "backend", depth: "core" },
  { id: "ocaml", family: "functional", variants: ["OCaml", "Caml", "ReasonML"], frameworks: ["dune", "opam", "alcotest"],
    detect: { manifests: ["dune-project"], exts: [".ml", ".mli", ".re"], markers: ["opam"] },
    test: [{ framework: "dune", cmd: "dune test" }], lane: "code", platform: "backend", depth: "core" },
  { id: "lisp", family: "functional", variants: ["Common Lisp", "Scheme", "Clojure", "Visual Lisp/AutoLISP", "Emacs Lisp"],
    frameworks: ["ASDF/Quicklisp", "Leiningen (Clojure)", "FiveAM"],
    detect: { manifests: ["project.clj", "deps.edn"], exts: [".lisp", ".cl", ".el", ".clj", ".lsp", ".scm"], markers: [".asd"] },
    test: [{ framework: "lein", cmd: "lein test", needs: "project.clj" }, { framework: "fiveam", cmd: "run the FiveAM suite via your Lisp" }],
    lane: "code", platform: "backend", depth: "core" },
  { id: "prolog", family: "logic", variants: ["SWI-Prolog", "Visual Prolog", "GNU Prolog"], frameworks: ["plunit"],
    detect: { manifests: [], exts: [".pro", ".prolog", ".plt"], markers: [] },
    test: [{ framework: "plunit", cmd: "swipl -g run_tests -t halt" }], lane: "code", platform: "backend", depth: "core",
    notes: ".pl collides with Perl — resolved by content markers (:- vs use strict)" },
  // ── Legacy / enterprise ─────────────────────────────────────────────────
  { id: "cobol", family: "legacy", variants: ["COBOL-85", "Enterprise COBOL", "GnuCOBOL"], frameworks: ["JCL", "CICS", "GnuCOBOL"],
    detect: { manifests: [], exts: [".cbl", ".cob", ".cpy", ".jcl"], markers: [] },
    test: [{ framework: "gnucobol", cmd: "compile with cobc and run the test driver" }],
    lane: "code", platform: "backend", depth: "core" },
  { id: "fortran", family: "legacy", variants: ["FORTRAN 77", "Fortran 90/2008/2018"], frameworks: ["fpm", "OpenMP/MPI"],
    detect: { manifests: ["fpm.toml"], exts: [".f", ".f77", ".f90", ".f95", ".f03"], markers: [] },
    test: [{ framework: "fpm", cmd: "fpm test", needs: "fpm.toml" }, { framework: "make-check", cmd: "make check" }],
    lane: "code", platform: "backend", depth: "core" },
  // ── Data / infra ────────────────────────────────────────────────────────
  { id: "sql", family: "data", variants: ["PostgreSQL", "MySQL", "SQLite", "T-SQL", "PL/SQL"], frameworks: ["migrations", "dbt", "pgTAP"],
    detect: { manifests: ["dbt_project.yml"], exts: [".sql"], markers: ["migrations/"] },
    test: [{ framework: "dbt", cmd: "dbt test", needs: "dbt_project.yml" }, { framework: "pgtap", cmd: "pg_prove t/" }],
    lane: "code", platform: "data", depth: "core" },
  { id: "nix", family: "infra", variants: ["flakes", "classic"], frameworks: ["nixpkgs", "home-manager", "NixOS modules"],
    detect: { manifests: ["flake.nix", "default.nix"], exts: [".nix"], markers: [] },
    test: [{ framework: "nix-flake-check", cmd: "nix flake check" }], lane: "code", platform: "cli", depth: "core" },
];

/** Detect languages present in a signal bundle (names set + deps + extension census). */
export function detectLanguages(names, deps, extCensus) {
  const hit = [];
  for (const L of LANGUAGES) {
    const m = L.detect.manifests.some((f) => names.has(f));
    const e = L.detect.exts.some((x) => extCensus.has(x));
    const k = L.detect.markers.some((mk) => (deps && Object.keys(deps).some((d) => d.includes(mk))) || [...names].some((n) => n.includes(mk)));
    if (m || e || k) hit.push({ id: L.id, family: L.family, byManifest: m, lane: L.lane, platform: L.platform });
  }
  // disambiguate known extension collisions
  const has = (id) => hit.some((h) => h.id === id);
  if (has("matlab") && (names.has("Podfile") || [...names].some((n) => n.endsWith(".xcodeproj")))) {
    const i = hit.findIndex((h) => h.id === "matlab" && !h.byManifest); if (i >= 0) hit.splice(i, 1);
  }
  if (has("prolog") && has("perl")) { /* both plausible; keep both, diagnose asks if it matters */ }
  return hit;
}

/**
 * Resolve the first matching test framework for a detected language set.
 * A candidate with a satisfied `needs` is strong EVIDENCE tests exist; a
 * bare fallback runner (no `needs`) is only a suggestion — callers must
 * require independent test-file evidence before treating it as "has tests".
 */
export function resolveTestFramework(languageIds, names, deps) {
  const depHas = (n) => deps && Object.keys(deps).some((d) => d === n || d.startsWith(n));
  let fallback = null;
  for (const id of languageIds) {
    const L = LANGUAGES.find((x) => x.id === id); if (!L) continue;
    for (const t of L.test) {
      if (t.needs && (names.has(t.needs) || depHas(t.needs)))
        return { framework: t.framework, cmd: t.cmd, language: id, evidence: true };
      if (!t.needs && !fallback) fallback = { framework: t.framework, cmd: t.cmd, language: id, evidence: false };
    }
  }
  return fallback;
}
