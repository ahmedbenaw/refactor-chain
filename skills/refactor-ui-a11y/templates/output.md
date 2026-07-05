# Accessibility & responsive gate report — scaffold

Fill in the placeholders. This is the gate report the skill produces. It ends in a
**PASS / BLOCK** verdict — the UI lane is not "done" until PASS (or a Blocker is explicitly accepted).

---

## Accessibility & responsive gate — {{project / area}}

**Standard:** WCAG 2.2 AA  ·  **Scope:** fix a11y/responsive defects; content & behavior preserved.
**Prerequisite state:** components adopted ({{yes}}), tokens present ({{yes}}).

### You are here
Do-the-work · UI lane · **a11y gate** (final UI step). Prev: refactor-ui-components. Next: refactor-code-principles.

---

### Findings by criterion
| Criterion | Area | Status | Evidence | Fix |
|---|---|---|---|---|
| 1.4.3 | contrast | {{fixed}} | {{2.6:1 → 4.6:1}} | {{snapped --color-text-muted to darker step}} |
| 1.1.1 | images | {{fixed}} | {{img no alt}} | {{meaningful alt / alt=""}} |
| 4.1.2 | name/role/state | {{fixed}} | {{icon button unnamed}} | {{aria-label; svg aria-hidden}} |
| 2.1.1 | keyboard | {{fixed}} | {{div onClick}} | {{native button}} |
| 2.4.7 | focus visible | {{fixed}} | {{outline:none}} | {{:focus-visible ring, token, ≥3:1}} |
| 2.4.3 | focus order | {{ok/fixed}} | {{positive tabindex}} | {{DOM order + tabindex 0/-1}} |
| 1.4.10 | reflow | {{fixed}} | {{table overflow @320px}} | {{reflow; scope scroll to region}} |
| 1.4.4 | resize/zoom | {{fixed}} | {{user-scalable=no}} | {{removed; zoom works}} |
| 2.5.8 | target size | {{ok}} | {{≥24px}} | {{—}} |
| dynamic-type | mobile scaling | {{ok}} | {{200% no clip}} | {{—}} |

(Paste `node scripts/audit-a11y.mjs <dir> --pretty` summary; add runtime axe/browser results.)

### Contrast checks
| Element | Fg | Bg | Ratio | Needs | Result |
|---|---|---|---|---|---|
| {{muted meta}} | {{}} | {{}} | {{4.6:1}} | 4.5:1 | {{PASS}} |

### Keyboard & screen-reader spot-check (manual)
- Tab through the whole view — logical order, visible focus, no trap: {{pass}}
- Skip-link to main present and working: {{pass}}
- Dialog/route change moves & restores focus correctly: {{pass}}
- Screen-reader announces names/roles/states correctly: {{pass}}

### Responsive check
- 320 / 375 / 768 / 1024 / 1280 px: {{no horizontal scroll on content}}
- 200% zoom usable: {{pass}}
- Largest mobile dynamic-type: {{no truncation/overlap}}

---

### Gate verdict
**{{PASS | BLOCK}}**
- Fixed criteria: {{1.1.1, 1.4.3, 4.1.2, 2.1.1, 2.4.7, 1.4.10, 1.4.4}}
- **Blockers (if any):** {{criterion — why it can't be met within constraints — options}}
- If BLOCK: the UI lane does not advance until resolved or the blocker is explicitly accepted by the user.

### Deferred / notes
- {{third-party widget with a keyboard trap; needs upstream fix or replacement}}
