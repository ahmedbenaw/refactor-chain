# refactor-understand — worked example

## Before: raw repository (what the user points at)

```
shopfront/
├── package.json          # name "shopfront", deps: next, react, react-dom, zod
├── pnpm-lock.yaml
├── tsconfig.json
├── next.config.mjs
├── tailwind.config.ts
├── components.json       # shadcn
├── .github/workflows/ci.yml   # steps: pnpm install; pnpm lint; pnpm test; pnpm build
├── app/                  # Next app-router pages
├── components/
├── lib/
└── (no test/ folder, no *.test.* files)
```

The user says: *"can you clean this up?"* — no lane chosen, nothing known yet.

## Signal dump (harness, read-only)

```
node ~/.claude/skills/refactor-chain/scripts/diagnose.mjs signals --target ./shopfront
```
Key fields returned:
```json
{
  "manifests": { "pkg": true, "pkgVersion": "0.3.1" },
  "framework": "next", "tailwind": true, "shadcn": true,
  "lockfiles": ["pnpm-lock.yaml"],
  "web": true, "monorepo": false,
  "testFramework": "", "hasTests": false,
  "ci": ["/.github/workflows"], "auth": false
}
```

## After: Project Profile (handed to refactor-diagnose)

- **Identity:** `shopfront` v0.3.1 — a **Next.js** web app (React + TypeScript,
  app-router).
- **Stack:** TypeScript · Next.js · Tailwind CSS · shadcn/ui · Zod.
- **Package manager:** **pnpm** (confirmed by `pnpm-lock.yaml`, not just the
  manifest).
- **Build/test/lint (real commands from CI):** `pnpm lint` · `pnpm test` ·
  `pnpm build`.
- **Structure:** source in `app/`, `components/`, `lib/`; entry via Next
  app-router. No dedicated tests folder.
- **Platform / OS:** web / cross.
- **Monorepo:** no — single project.
- **Test posture:** ⚠️ **no tests found.** CI runs `pnpm test` but there is no
  test file — the baseline phase must add a characterization safety net before
  any behavior-preserving change.
- **Conditional signals:** auth not detected; no telemetry/data layer; no
  Airflow DAGs.

## Why this matters downstream
- `refactor-diagnose` now classifies with real evidence: web lane, web platform,
  and (because the user said "clean up") a refactor intent → `refactor-web`.
- The **no-tests** finding pre-arms the safety-net gate, so the chain won't blindly
  edit code with no way to prove behavior is preserved.
- pnpm (not npm) means later verify steps use `pnpm`, avoiding a wrong-command
  failure loop.
