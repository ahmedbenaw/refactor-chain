# Worked example — a finished web-lane chain → its Change Report

## The run
A Vue 3 + TypeScript app went through the web lane: `refactor-web-01-structure` →
`02-modules` → `03-components` → `04-layout` → `05-naming` → `refactor-code-principles` → review gate.
All steps verified green. Two steps needed one self-heal each.

## Before snapshot (from refactor-understand)
> Vue 3 + TypeScript SPA, pnpm, Vite, Vitest tests present. `src/` mixed components, pages,
> and helpers at the top level; no `services/` layer; some components imported from `pages/`.

## After state (from state.json + git diff --stat)
- 41 files moved, 6 renamed, 0 files deleted.
- `verify.delta`: all `legal`/`clean`; steps 03 and 05 show `drift→healed`.

## The Change Report this skill produced

---

### What changed (plain English)
I reorganized this Vue app's folders and tidied a few names. **Your app does exactly what it
did before** — I re-ran your tests after every step and they matched every time.

**What changed:**
- Put files into clear folders: components, pages, and shared services now each have a home
  (before, they were mixed together at the top).
- Stopped a few components from reaching into the "pages" folder in a way that made the code
  tangled — they now get what they need the proper way.
- Renamed some files and functions so similar things are named consistently.

**What a user would notice:** nothing. That's the goal of a refactor — same behavior, cleaner code.

**What's safer now:** the folder layout matches the team standard, so the next person (or the
next refactor) can find things and won't accidentally recreate the tangle.

**What I checked:** your Vitest suite ran green before I started and green after every single
step. Two steps briefly changed a behavior; I caught both, undid them, and redid them correctly.

*(show technical details ↓)*

### Technical appendix

| Step | Did | Files | Verify |
|---|---|---|---|
| web-01-structure | created `services/`, moved static assets into `assets/{styles,icons,images}` | 18 moved | legal |
| web-02-modules | grouped feature code under `modules/` | 12 moved | clean |
| web-03-components | split `common`/`layout`/`business` tiers | 7 moved | drift→healed |
| web-04-layout | extracted shared layout shells | 3 moved | clean |
| web-05-naming | `use-` prefix on composables, consistent function names | 6 renamed | drift→healed |
| code-principles | one-responsibility tidy on 3 large modules | 4 edited | clean |
| review-gate | final ranked review — 0 blocking findings | — | pass |

- **Moves/renames:** `src/api.ts → src/services/api/index.ts`, `src/Btn.vue → src/components/common/BaseButton.vue`, … (full list in `git log`).
- **Checkpoints:** `pre-web-03`, `pre-web-05` (rollback: `git stash apply <sha>`).
- **Behavior evidence:** baseline = Vitest 214 passing; every step reproduced the identical 214.

---

## Why this is a good write-up
- The first half is readable by the product owner and answers "did you break my app?" up front.
- It's honest about the two self-heals instead of hiding them.
- The appendix is precise enough for the reviewer, and every claim traces to `state.json` / `git`.
