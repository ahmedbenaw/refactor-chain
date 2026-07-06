# Contributing to refactor-chain

Thanks for helping. refactor-chain is a nativized bundle: everything ships inside the
plugin, with **no runtime dependency on any external skill**. Keep it that way.

## Repo layout

```
refactor-chain/
  skills/        one dir per skill (SKILL.md + references/ + examples/ + scripts/ + templates/)
  commands/      one .md slash command per user-facing action (/refactor, /fix, /check, …)
  scripts/       the harness — orchestrate.mjs, diagnose.mjs, boot/intake/guard/risk-guard/ship-gate + lib/
  hooks/         hooks.json — the 5 dormant-until-active plugin hooks
  installer/     shared install contract: INSTALL-SPEC.md, manifest.json, go/ (Go binary source)
  docs/          DESIGN-v2.md, PLAN-v2.md, SKILL-TEMPLATE.md
  install.sh     POSIX universal installer (macOS/Linux)   ·   .claude-plugin/plugin.json
```

## Adding a skill

Read [`docs/SKILL-TEMPLATE.md`](./docs/SKILL-TEMPLATE.md) **fully** first — it is the
source of truth. Every skill is 100% populated (nothing stubbed) and ships **5 file
types**:

```
skills/<skill-name>/
  SKILL.md                  the skill (frontmatter = name + description only)
  references/method.md      the full method/rules — the depth
  examples/before-after.md  at least one concrete before → after + why
  scripts/                  a real helper; if none is needed, add scripts/checklist.mjs (zero-dep)
  templates/output.md       the scaffold the skill fills when it produces output
```

`SKILL.md` uses the **8-section format**, in this exact order: **Purpose · When to use ·
What I'll tell you (plain-language) · Method · Guardrails · Verify · Resources · Chain
position.** The description is third-person, starts with "Use this skill when…", names
the skill's phase/lane in the pipeline, and flags whether it's conditional or advisory.
Keep the body 500–1200 words; put exhaustive rules in `references/method.md`.

Don't reinvent state or detection — reference the existing harness
(`scripts/orchestrate.mjs` + `scripts/diagnose.mjs`).

## Try the installer safely

Always dry-run first — it detects surfaces and prints the plan without touching
anything:

```sh
sh install.sh --dry-run
```

Add `--details` for verbose output, or `--only <ids>` to scope it (e.g.
`--only claude-code`).

## The one rule: behavior-preserving & nativized

- **Behavior-preserving.** Refactoring changes *how* code is written, never *what it
  does*. If a skill can alter behavior, it must prove the change (the `/fix` lane is
  the only place a behavior change is the goal).
- **Nativized.** Bake the method into the skill's own files. No skill may depend on an
  external bundle at runtime. If you port logic from an upstream source, credit it in
  `.claude-plugin/plugin.json` (see the existing three credits).

## Releases

Releases are cut by tagging:

1. Push a tag matching `v*` (e.g. `git tag v2.0.1 && git push --tags`).
2. CI builds the cross-platform **Go binaries** (the no-runtime installer fallback)
   and attaches them to the GitHub Release.
3. `install.sh`, `install.ps1`, `rcx.mjs`, and the Go binary all read
   `installer/manifest.json`, so bump `version` there and in
   `.claude-plugin/plugin.json` in the same tagged commit.

Keep the four installer layers behaviorally identical — they implement the one
algorithm in [`installer/INSTALL-SPEC.md`](./installer/INSTALL-SPEC.md).

## Versioning (semver)

MAJOR = breaking change to a command name, skill name, or `state.json` schema (schema stays v3; all changes must be additive and preserve unknown fields). MINOR = new skills/commands/languages/checks, additive harness subcommands. PATCH = fixes with no interface change. The tag is always read from `.claude-plugin/plugin.json` by `publish.sh` — never hardcode a version anywhere else.

## The README banner

The banner is `docs/assets/banner.svg` (SVG renders natively on GitHub). If you prefer the original raster art, save it as `docs/assets/banner.png` and change one line at the top of `README.md` (`banner.svg` → `banner.png`).

## Before you push (the CI gates, runnable locally)

```sh
node tests/run-all.mjs                       # 6 suites — all must pass
node scripts/audit.mjs --provenance-strict   # 0 findings required
npx --yes eslint .                           # core-rules lint, zero deps
shellcheck install.sh                        # POSIX installer hygiene
```

CI runs exactly these (plus JSON validation and a dogfood run of the GitHub
Action); a PR cannot merge red.
