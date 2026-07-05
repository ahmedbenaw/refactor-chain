# Project Profile — <project-name>

_Produced by `refactor-understand` (read-only). Handed to `refactor-diagnose`._

## In one sentence
<e.g. "A Next.js web app in TypeScript, built with pnpm, tested with Vitest.">

## Identity & stack
- **Name / version:** `<name>` `<version-or-unknown>`
- **Language(s):** `<language(s)>`
- **Framework:** `<framework-or-none>`
- **Notable libraries:** `<libs>`

## Package manager & reproducibility
- **Manager:** `<npm|pnpm|yarn|bun|poetry|pip|maven|gradle|go|cargo|composer|bundler>`
- **Confirmed by lockfile:** `<lockfile-or-"none (unpinned)">`

## Build / test / lint commands (the real ones)
- **Build:** `<command>`
- **Test:** `<command>`
- **Lint:** `<command-or-none>`
- **Source of truth:** `<CI file | Makefile | package.json scripts | inferred>`

## Structure
- **Source root(s):** `<paths>`
- **Test location:** `<path-or-"none">`
- **Entry point(s):** `<files>`
- **Monorepo:** `<no | yes — subprojects: [...]>`

## Platform / OS
- **Platform:** `<web|mobile|desktop|backend|cli|monorepo>`
- **OS:** `<posix|windows|ios|android|cross>`

## Test posture (safety-net gate)
- **Has tests:** `<yes|no>`
- **Framework:** `<framework-or-none>`
- **Gate:** `<"existing suite is the baseline" | "⚠️ no tests — add characterization safety net at baseline phase before editing">`

## Conditional signals (for later phases)
- **Auth code present:** `<yes|no>`  ·  **Telemetry/data layer:** `<yes|no>`  ·  **Airflow DAGs:** `<yes|no>`

## Raw evidence
```json
<paste the diagnose.mjs signals JSON here for traceability>
```

## Handoff
> Ready for `refactor-diagnose` to classify this request into {case, os, platform, confidence, mode}.
