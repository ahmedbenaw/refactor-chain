# refactor-artifacts-sync — full method: per-artifact drift detection

Four durable artifacts describe the app to future readers. A refactor makes them lie. This skill
re-truths them — surgically, changing only the drifted parts.

## Golden rule: update only what drifted
Never regenerate a whole document from scratch (that destroys hand-written rationale and
diagrams). Diff each artifact against the current code, and edit only the lines the refactor
made wrong. Everything else stays.

## Inputs
- The `refactor-write-up` Change Report (what moved/renamed/re-layered).
- `git diff --stat` and `git log` since the first checkpoint (ground truth of moves/renames).
- `state.json` steps (which lane ran → which artifacts are likely affected).

Lane → likely-affected artifacts:

| Lane / step | architecture | flows | permissions | tests-map |
|---|:--:|:--:|:--:|:--:|
| structure / modules / layout | ●● | ● | | ● |
| naming / api-naming | ● | ● | ● | ● |
| service / controller | ● | ●● | ●● | ● |
| dao-model / data | ●● | ● | | ● |
| auth-hardening | | ● | ●● | ● |
| safety-net (added tests) | | | | ●● |

## Per-artifact drift rules

### architecture.md
Describes the module/layer map, folder structure, and allowed dependency direction.
- **Drift signals:** a folder in the doc no longer exists at that path; a new layer/module
  appears in code but not the doc; the stated dependency direction contradicts the new imports.
- **Fix:** update the structure tree and the layer/reference-direction section. Keep the
  "why we're organized this way" prose.

### flows.md
Describes key end-to-end user/data flows (e.g. "login", "checkout", "import CSV").
- **Drift signals:** a flow step names a file/function/endpoint that was moved or renamed;
  a route path changed; a service call now goes through a new layer.
- **Fix:** re-point the flow's steps to the new locations/names. Preserve the flow's intent
  and any sequence diagram (only update the labels that changed).

### permissions.md
Describes roles, guarded routes/actions, and who-can-do-what.
- **Drift signals:** a guard/middleware moved or was renamed; a route's protection changed;
  a role reference points to renamed code.
- **Fix:** update guard locations/names and the route-permission table. **Any permission the
  refactor actually changed (not just relocated) must be flagged and handed to
  `refactor-audit-trail`** — a moved guard is a doc fix; a changed guard is a security event.

### tests-map.md
Maps which tests cover which behavior/module.
- **Drift signals:** a test path moved; a module was renamed; new characterization tests were
  added by `refactor-safety-net` but aren't listed; a test was deleted.
- **Fix:** update paths, add newly-created tests (with the behavior they pin), remove entries
  for deleted tests. Keep the coverage-gap notes.

## Create-if-missing
For any artifact absent (`checklist.mjs --find` reports it), **ask** before creating. If the
user agrees, copy `templates/<artifact>.md` and populate it from the current code. Never
silently generate docs the team didn't have.

## Verification recipe
- Grep every path/symbol referenced in each updated artifact against the current tree — all must resolve.
- Confirm no artifact still references an old (moved/renamed/deleted) location.
- Record the set of changed artifacts (e.g. `{architecture, flows}`) so
  `refactor-publish-checklist` can confirm "all artifacts current".
