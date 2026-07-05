# Component standards & generation — full method

Deterministic rulebook behind `refactor-web-03-components`. Token-driven: every color
or size below names a **semantic token role**, resolved to the project's actual token
layer at run time. Framework-adaptive: audit selectors and generated code follow the
ecosystem detected by the harness signals registry.

## 1. Token resolution policy

1. Discover the project's token vocabulary: CSS custom properties, a theme object, a
   design-token file, or the output of `refactor-ui-tokens`.
2. Map each rule's **role** (primary, danger, success, warning, text-body, text-label,
   text-placeholder, bg-disabled, bg-hover, bg-selected, divider, link; font-size
   title/body/auxiliary) to the project's token names. Record the mapping in the
   report header.
3. No token layer? Flag it, cross-reference `refactor-ui-tokens`, and downgrade color
   ERRORs to WARNs until tokens exist — enforcing literals against literals is noise.
4. Fixes replace a literal with the token whose **resolved value and semantic role
   both match**. Value matches but role is wrong (danger-red used as decoration) →
   report for a human. No match → report, never guess.

## 2. Severity tiers and thresholds

- **ERROR** blocks the step; **WARN** advisory, fix on confirmation; **SUGGESTION**
  advisory only.
- Dimensional caps are configurable thresholds (defaults in parentheses); overrides
  are declared once per run and echoed in the report: primary buttons per view (1),
  danger buttons per view (1), visible action buttons before overflow collapse (4),
  overflow-panel width (200px), label width (8 characters / 1 line), frozen columns
  per table side (3), quick-query conditions (3), query-panel controls per row (3).

## 3. Rule tables

### CLR — color (5)
| ID | Severity | Rule |
|----|----------|------|
| CLR-1 | ERROR | Brand-role elements (primary buttons, links, selected text) use the primary token — no literal that merely *looks* like it. |
| CLR-2 | WARN | Neutral roles (labels, body, placeholders, dividers, disabled/hover/selected backgrounds) use their neutral tokens consistently. |
| CLR-3 | ERROR | Functional colors carry meaning: danger/error role for errors and required markers, success and warning roles likewise — never swapped or decorative. |
| CLR-4 | WARN | Distinct color roles per view stay within the palette cap; one-off shades are consolidated onto the nearest token. |
| CLR-5 | SUGGESTION (ERROR once a token layer exists) | Color literals (hex/rgb/hsl) in component code are replaced by tokens. |

### TYP — typography (5)
| ID | Severity | Rule |
|----|----------|------|
| TYP-1 | ERROR | Font sizes come from the token scale: title role for card/section titles, body role for labels/buttons/content, auxiliary role for hints. |
| TYP-2 | WARN | Weight follows convention: titles and table headers bold, body regular; no ad-hoc weights. |
| TYP-3 | WARN | Labels respect the width cap; longer labels truncate with a full-text tooltip. |
| TYP-4 | WARN | Alignment: text left, numbers right, status/enums centered. |
| TYP-5 | WARN | Numbers formatted: thousands separators; amounts to the project's decimal convention (default 2). |

### BTN — buttons (8)
| ID | Severity | Rule |
|----|----------|------|
| BTN-1 | ERROR | At most the threshold (default 1) primary button per view. |
| BTN-2 | WARN | At most the threshold (default 1) danger button per view; danger styling only for destructive actions. |
| BTN-3 | WARN | Visible actions beyond the collapse threshold fold into an overflow ("More") control. |
| BTN-4 | WARN | Overflow panel respects its width cap. |
| BTN-5 | ERROR | Button text uses the body font-size token. |
| BTN-6 | WARN | Async actions show a loading state and prevent double submission. |
| BTN-7 | WARN | Secondary-page action groups follow one consistent order/direction. |
| BTN-8 | WARN | Back/return buttons sit in the consistent position for the app. |

### INP — input controls (8)
| ID | Severity | Rule |
|----|----------|------|
| INP-1 | ERROR | Required fields carry the required marker, styled with the danger token, tied to validation. |
| INP-2 | WARN | Placeholders present, in the placeholder text token, and phrased as hints — never as substitute labels. |
| INP-3 | WARN | Disabled states use the disabled background/text tokens, not opacity hacks. |
| INP-4 | WARN | Selects/dropdowns follow the project's component-library convention (search, empty state). |
| INP-5 | SUGGESTION | Text inputs are clearable where the library supports it. |
| INP-6 | WARN | Label layout consistent (stacked or inline — one convention per app); labels respect the width cap. |
| INP-7 | WARN | Editable-in-place areas carry the editable-surface token so they're visually distinct. |
| INP-8 | WARN | Query panels: controls-per-row threshold; quick conditions within cap, the rest behind "advanced". |

### TBL — tables (11)
| ID | Severity | Rule |
|----|----------|------|
| TBL-1 | ERROR | Row-number column present as the first column (frozen at the start where the library supports it). |
| TBL-2 | WARN | Selection (checkbox) column, when present, sits before content columns. |
| TBL-3 | WARN | Action column is last (frozen at the end). |
| TBL-4 | WARN | Frozen columns per side within the threshold. |
| TBL-5 | WARN | Zebra striping via the standard row tokens. |
| TBL-6 | WARN | Header row bold and centered per TYP-2. |
| TBL-7 | WARN | Cell alignment per TYP-4. |
| TBL-8 | WARN | Totals row below the table; selected-totals row above it, when applicable. |
| TBL-9 | WARN | In-table links use the link token and one hover convention. |
| TBL-10 | SUGGESTION | Column widths set deliberately (fixed for numeric/status, flexible for text). |
| TBL-11 | SUGGESTION | Sortable/filterable columns expose the library's affordances instead of custom widgets. |

## 4. Audit procedure

1. Resolve framework, component library, token map, thresholds. 2. Scope files and
categories. 3. Evaluate each rule with file:line evidence and the token-resolved fix.
4. Report severity totals; ERROR-tier findings block the step until fixed or waived.

## 5. Fix procedure (confirmation-gated)

Checkpoint → confirmed plan → batches (literals→tokens first, then structural rules) →
baseline re-run per batch → re-audit. Never auto-fix WARN/SUGGESTION without
confirmation; never introduce a new literal.

## 6. Framework adaptation

Selectors and codegen use the detected idiom: React (JSX props, hooks, CSS
modules/styled tokens), Vue (SFC templates, scoped styles, `v-model`), Svelte
(component props, style blocks), Angular (templates, `[attr.aria-*]`, component
styles). Component-library primitives (buttons, selects, tables) are used where the
project already depends on one; plain semantic HTML otherwise.

## 7. Generation recipes (composite components)

Each recipe lists its required parts; generated output is **self-audited** against
§3 before delivery, and every interactive element carries an accessible name
(`aria-label`/`aria-labelledby`, label-for association, or the framework equivalent).

- **Query panel:** controls-per-row threshold, quick conditions within cap +
  "advanced" expander, search/reset actions (one primary), INP-1/2/6 applied.
- **Data table:** row-number column, optional selection column, typed alignment,
  zebra tokens, frozen action column, pagination, empty state; TBL-1…11 applied.
- **Form card:** title on the title token, stacked labels with required markers,
  validation wiring, one primary submit; INP + BTN rules applied.
- **Detail card:** read-only label/value grid, TYP alignment and formatting rules.
- **Log view:** timestamped entries, auxiliary-size metadata, level colors from
  functional tokens only.
- **Progress indicator:** determinate/indeterminate variants, status announced
  accessibly (e.g. `role="progressbar"` with value attributes).

## 8. Verification

Zero ERROR findings in scope (or recorded waivers); no new literals introduced (grep
color/size literals in the diff); generated components pass self-audit; baseline
green; hand off to the chain verify gate.
