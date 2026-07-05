# refactor-understand — full method

Read-only project intake. Absorbs the intent of `analyze`, `analyzing-data`, and
`document-app` into one native, dependency-free understand step. The goal is a
**Project Profile**: a short, accurate description of what the project is and how
it builds/tests, used by every downstream refactor-chain skill.

## Single source of evidence

Do **not** reinvent detection. The harness already collects every signal you
need, read-only and depth-bounded:

```
node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target <dir>
```

Returned JSON fields you will use: `manifests`, `groupId`, `deps`, `lockfiles`,
`framework`, `tailwind`, `shadcn`, `mobile`, `desktop`, `ci`, `docker`,
`makefile`, `shebangBin`, `windows`, `web`, `monorepo`, `manifestCount`, `data`,
`airflow`, `testFramework`, `hasTests`, `auth`, `names`.

Only open individual files when the signal dump is ambiguous or you need a human
detail (a script name, a CI job command, a README one-liner).

## Field-by-field intake

### 1. Identity & stack
- **Language(s):** infer from manifests — `pom.xml`/`build.gradle` → Java/Kotlin;
  `package.json` → JS/TS (check for `tsconfig.json`); `go.mod` → Go;
  `pyproject.toml`/`requirements.txt`/`Pipfile` → Python; `Cargo.toml` → Rust;
  `*.csproj`/`*.sln` → .NET; `pubspec.yaml` → Dart/Flutter; `Gemfile` → Ruby;
  `composer.json` → PHP.
- **Framework:** use `signals.framework` (`next`, `angular`, `vue`, `svelte`,
  `react-native`, `react`, `flutter`) plus `tailwind`/`shadcn` flags.
- **App identity:** Maven `groupId`, `package.json` name/version, or the repo
  folder name.

### 2. Package manager & reproducibility
- Confirm the manager from the **lockfile actually present**, never from the
  manifest alone:
  - `pnpm-lock.yaml` → pnpm · `yarn.lock` → yarn · `package-lock.json` → npm ·
    `bun.lockb` → bun.
  - `poetry.lock` → poetry · `Pipfile.lock` → pipenv · else pip.
  - `go.sum`, `Cargo.lock`, `composer.lock`, `Gemfile.lock` confirm the rest.
- No lockfile present → record "no lockfile (unpinned deps)" — a real finding for
  the diagnostic engine.

### 3. Build / test / lint commands (the real ones)
- Prefer commands the team already runs over ones you invent:
  - `package.json` `scripts` block → `build`, `test`, `lint`, `dev`.
  - `Makefile` targets. `Dockerfile` build stages. CI workflow steps.
  - Java: `mvn -q -DskipTests package` / `mvn test`; Gradle: `./gradlew build`.
  - Go: `go build ./... && go test ./...`. Python: `pytest`. Rust: `cargo test`.
- Record the exact command strings — a later baseline step reuses them verbatim.

### 4. Structure & entry points
- List top-level folders; identify source root(s) (`src`, `app`, `lib`,
  `cmd`, `pkg`) and where tests live (`test`, `tests`, `__tests__`, `spec`).
- Entry points: `main`/`index` files, `cmd/*/main.go`, `Application.java` /
  `@SpringBootApplication`, `next` pages/app dir, `bin/` shebang scripts.

### 5. Platform & OS (feeds diagnose, don't re-derive lane)
- Platform via `detectPlatform`: web / mobile / desktop / backend / cli /
  monorepo. OS via `detectOS`: posix / windows / ios / android / cross.
- These tune later verify commands (e.g. PowerShell-safe on Windows); this skill
  only records them.

### 6. Monorepo handling
- If `monorepo` is true (`workspaces` / `pnpm-workspace.yaml` / `nx.json` /
  `turbo.json` / `lerna.json` / `manifestCount > 1`): enumerate the subprojects
  and note there is **no single stack**. Tell the user; do not pick a package for
  them — `refactor-diagnose` runs the "start with main, or pick a package?"
  clarify.

### 7. Test posture (safety-net gate)
- `hasTests=false` → flag prominently: the chain must add a characterization
  safety net at the baseline phase before any behavior-preserving change.
- `hasTests=true` → record `testFramework` so baseline can run the existing suite
  as the green bar.

## Output contract
Produce the Project Profile from `templates/output.md`. Every field filled — use
"unknown" or "none found" rather than leaving a blank. Hand the profile to
`refactor-diagnose`; attach the raw signals JSON for traceability.

## Boundaries
- Never install, build, or run the project during understand — that is a later,
  consented phase.
- Never edit files. Never write into the repo except (optionally) the chain's own
  `.refactor-chain/` state dir, which the harness owns.
- One missing/broken file must never abort the intake; degrade to "unknown".
