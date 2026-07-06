/**
 * refactor-chain — shared signal collection. Read-only, fs-only, no deps.
 * Single source of evidence for diagnose.mjs (and orchestrate.mjs).
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, extname } from "node:path";
import { detectLanguages, resolveTestFramework } from "./languages.mjs";

const readSafe = (p) => { try { return readFileSync(p, "utf8"); } catch { return ""; } };
const has = (dir, rel) => existsSync(join(dir, rel));

// bounded recursive listing (depth-limited, skips heavy dirs) for manifest discovery
function walk(dir, depth = 2, acc = []) {
  let entries = [];
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    if (e.name.startsWith(".") && e.name !== ".github" && e.name !== ".specify") continue; // .specify = spec-kit signal
    if (["node_modules", "dist", "build", "target", "vendor", "Pods", ".git"].includes(e.name)) continue;
    const full = join(dir, e.name);
    acc.push({ path: full, name: e.name, dir: e.isDirectory() });
    if (e.isDirectory() && depth > 0) walk(full, depth - 1, acc);
  }
  return acc;
}

/** Collect raw evidence from a target project directory. */
export function collectSignals(targetDir) {
  const all = walk(targetDir, 2);
  const names = new Set(all.map((x) => x.name));
  const anyMatch = (re) => all.some((x) => !x.dir && re.test(x.name));
  const anyPath = (re) => all.some((x) => re.test(x.path));

  const pomRoot = has(targetDir, "pom.xml");
  const pkgRoot = has(targetDir, "package.json");
  const pom = readSafe(join(targetDir, "pom.xml"));
  const groupId = (pom.match(/<groupId>([^<]+)<\/groupId>/) || [])[1] || "";
  let pkg = {};
  try { pkg = JSON.parse(readSafe(join(targetDir, "package.json")) || "{}"); } catch { pkg = {}; }
  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const depHas = (name) => Object.keys(deps).some((d) => d === name || d.startsWith(name));

  const manifests = {
    pom: pomRoot, mavenAny: pomRoot || anyMatch(/^pom\.xml$/),
    gradle: names.has("build.gradle") || names.has("build.gradle.kts"),
    pkg: pkgRoot, pkgVersion: pkg.version || "",
    csproj: anyMatch(/\.(csproj|sln)$/),
    cargo: names.has("Cargo.toml"), go: names.has("go.mod"),
    python: names.has("requirements.txt") || names.has("pyproject.toml") || names.has("Pipfile"),
    php: names.has("composer.json"), ruby: names.has("Gemfile"),
    flutter: names.has("pubspec.yaml"),
  };
  const lockfiles = ["package-lock.json", "pnpm-lock.yaml", "yarn.lock", "bun.lockb", "Cargo.lock", "go.sum", "poetry.lock", "composer.lock", "Gemfile.lock"].filter((f) => names.has(f));

  const framework =
    depHas("next") || names.has("next.config.mjs") || names.has("next.config.js") ? "next" :
    names.has("angular.json") ? "angular" :
    depHas("vue") || depHas("nuxt") || names.has("nuxt.config.ts") ? "vue" :
    depHas("svelte") || names.has("svelte.config.js") ? "svelte" :
    depHas("react-native") ? "react-native" :
    depHas("react") ? "react" :
    manifests.flutter ? "flutter" : "";
  const tailwind = names.has("tailwind.config.js") || names.has("tailwind.config.ts") || names.has("tailwind.config.mjs");
  const shadcn = names.has("components.json");

  const mobile = {
    ios: anyMatch(/\.(xcodeproj|xcworkspace|pbxproj)$/) || names.has("Info.plist") || names.has("Podfile"),
    android: names.has("AndroidManifest.xml") || anyPath(/(^|\/)android\/.*build\.gradle/) || names.has("google-services.json"),
    flutter: manifests.flutter,
    rn: depHas("react-native"),
  };
  const desktop = { electron: depHas("electron"), tauri: names.has("tauri.conf.json"), wpf: manifests.csproj };

  const ci = ["/.github/workflows", ".gitlab-ci.yml", "Jenkinsfile", ".circleci"].filter((c) => anyPath(new RegExp(c.replace(/[.]/g, "\\."))));
  const docker = names.has("Dockerfile") || names.has("docker-compose.yml") || names.has("compose.yaml");
  const makefile = names.has("Makefile");
  const shebangBin = all.some((x) => !x.dir && /(^|\/)(bin|scripts)\//.test(x.path) && readSafe(x.path).startsWith("#!"));
  const windows = anyMatch(/\.(sln|ps1|bat|cmd)$/);
  const web = pkgRoot && (names.has("index.html") || ["next", "angular", "vue", "svelte", "react"].includes(framework) || tailwind);

  const manifestCount = all.filter((x) => !x.dir && /^(package\.json|pom\.xml|build\.gradle|go\.mod|Cargo\.toml)$/.test(x.name)).length;
  const monorepo = Boolean(pkg.workspaces || names.has("pnpm-workspace.yaml") || names.has("nx.json") || names.has("turbo.json") || names.has("lerna.json") || manifestCount > 1);

  const data = ["prisma", "migrations", "supabase"].filter((d) => all.some((x) => x.dir && x.name === d))
    .concat(anyMatch(/\.sql$/) ? ["sql"] : []);

  const airflow = all.some((x) => x.dir && x.name === "dags") || depHas("apache-airflow");

  // ---- extension census + registry-driven language detection (additive) ----
  const extCensus = new Set(all.filter((x) => !x.dir).map((x) => extname(x.name)).filter(Boolean));
  const languages = detectLanguages(names, deps, extCensus);

  // ---- embedded platform markers ----
  const toolchainHint = anyMatch(/toolchain.*\.cmake$/) ||
    (names.has("CMakeLists.txt") && /arm-none-eabi|riscv|avr-gcc|xtensa/.test(readSafe(join(targetDir, "CMakeLists.txt"))));
  const embedded = names.has("platformio.ini") || names.has("west.yml") || names.has("Kconfig") ||
    anyMatch(/\.(ino|dts|dtsi)$/) || anyPath(/(^|\/)zephyr(\/|$)/) || toolchainHint;

  // legacy explicit chain first (behavior preserved), then the registry resolves the rest
  let testFramework =
    depHas("vitest") ? "vitest" : depHas("jest") ? "jest" : depHas("@playwright/test") || depHas("playwright") ? "playwright" : depHas("cypress") ? "cypress" :
    manifests.python && (names.has("pytest.ini") || anyPath(/test_.*\.py|_test\.py/)) ? "pytest" :
    manifests.go ? "gotest" : manifests.mavenAny ? "maven" : manifests.gradle ? "gradle" : "";
  const fileTestEvidence = anyMatch(/(\.test\.|\.spec\.|_test\.|^test_)/) ||
    all.some((x) => x.dir && ["test", "tests", "__tests__", "spec"].includes(x.name));
  let testCmd = null;
  if (!testFramework && languages.length) {
    const r = resolveTestFramework(languages.map((l) => l.id), names, deps);
    // needs-based match = real evidence; a bare fallback runner only counts when test files exist
    if (r && (r.evidence || fileTestEvidence)) { testFramework = r.framework; testCmd = r.cmd; }
  }
  const hasTests = testFramework !== "" || fileTestEvidence;

  const specKit = all.some((x) => x.dir && x.name === ".specify") || anyPath(/(^|\/)\.specify(\/|$)/);

  const auth = depHas("better-auth") || depHas("@auth0") || depHas("next-auth") || depHas("passport") ||
    // `auth(?!ors?\b)` matches auth/authentication/authorize but NOT author/authors/AUTHORS.md
    // (the greedy-substring false positive that convened auth-hardening on repos with no auth code).
    anyPath(/(login|session|oauth|jwt|auth(?!ors?\b))/i);

  return {
    root: targetDir, manifests, groupId, deps, lockfiles, framework, tailwind, shadcn,
    mobile, desktop, ci, docker, makefile, shebangBin, windows, web, monorepo, manifestCount,
    data, airflow, testFramework, testCmd, hasTests, auth, embedded, specKit,
    languages, names: [...names],
  };
}

/** Map signals → OS label (tunes verify-command shape & paths, not lane). */
export function detectOS(s) {
  if (s.mobile.ios && !s.web) return "ios";
  if (s.mobile.android && !s.web) return "android";
  if (s.windows) return "windows";
  if (s.makefile || s.manifests.mavenAny || s.manifests.go) return "posix";
  return "cross";
}

/** Map signals → platform label. */
export function detectPlatform(s) {
  if (s.monorepo) return "monorepo";
  if (s.embedded) return "embedded";
  if (s.mobile.ios || s.mobile.android || s.mobile.flutter || s.mobile.rn) return "mobile";
  if (s.desktop.electron || s.desktop.tauri || s.desktop.wpf) return "desktop";
  if (s.web) return "web";
  if (s.manifests.mavenAny || s.manifests.gradle || s.manifests.go || s.manifests.python || s.manifests.csproj) return "backend";
  if ((s.languages || []).some((l) => l.platform === "backend" || l.platform === "data")) return "backend";
  if (s.makefile || s.shebangBin) return "cli";
  return "unknown";
}
