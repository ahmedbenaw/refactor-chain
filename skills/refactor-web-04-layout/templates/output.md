# Layout & interaction audit — {{project}} · refactor-web-04-layout

**Mode:** {{check | generate}} · **Framework:** {{react|vue|svelte|angular|dom}} (via signals registry)
**Scope:** {{files/routes audited}} · **Rule sets:** {{LAY, INT, or both}}
**Token source:** {{where the size/spacing tokens live, or "proposed — see below"}}

## Summary (plain language)
{{2-3 sentences: what was checked, how consistent the pages already are, what must change.
No jargon — e.g. "Your dialogs use five different widths; the standard needs three."}}

**You are here:** step 4 of 5 in the web lane. Next: naming (step 5).

## Findings

### Must fix (ERROR)
| # | Rule | Where | What's wrong | Fix |
|---|------|-------|--------------|-----|
| 1 | {{LAY-xx / INT-xx}} | {{file:line}} | {{one plain sentence}} | {{behavior-preserving fix}} |

### Should fix (WARNING)
| # | Rule | Where | What's wrong | Fix |
|---|------|-------|--------------|-----|

### Worth considering (SUGGESTION)
| # | Rule | Where | Suggestion |
|---|------|-------|------------|

## Already compliant
- {{rule}} — {{where it's done right; keeps the report honest and morale up}}

## Token bindings used / proposed
| Role | Bound to | Status |
|------|----------|--------|
| dialog.sm / md / lg | {{token}} | {{existing | proposed}} |
| drawer.narrow / wide | {{token}} | {{existing | proposed}} |
| space.step | {{token}} | {{existing | proposed}} |

## Generated page (generate mode only)
- **Archetype:** {{workspace | full-screen detail | drawer | dialog}}
- **Files created:** {{paths}}
- **Self-audit:** {{"all LAY/INT rules pass" or list of accepted deviations + why}}

## Verify
- [ ] Re-run check: zero ERROR findings in scope
- [ ] App builds; existing tests pass; screens render with identical data/actions
- [ ] Recorded via `orchestrate.mjs step-done --skill refactor-web-04-layout`

*Show technical details:* full rule text in `references/method.md`; worked fix in
`examples/before-after.md`.
