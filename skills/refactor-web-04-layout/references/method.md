# Layout & interaction rule catalog — refactor-web-04-layout

The complete method this skill applies. Two rule sets (structure `LAY`, interaction `INT`),
a token-mapping procedure, framework adaptation notes, and four generation archetypes.
Severities: **ERROR** (breaks the standard, always report), **WARNING** (report unless the
project has a documented exception), **SUGGESTION** (offer, never nag).

## 0. Token resolution (run first)

All sizes below are *roles*, not numbers. Before checking anything, bind each role to the
project's own token system:

| Role | Meaning | Typical binding |
|---|---|---|
| `dialog.sm` | alert / confirm box width | smallest dialog width token |
| `dialog.md` | one-column form dialog width | mid dialog width token |
| `dialog.lg` | two-column form dialog width | large dialog width token |
| `drawer.narrow` | read-only / one-column drawer width | narrow panel token |
| `drawer.wide` | editing / two-column drawer width | wide panel token |
| `space.step` | base spacing unit for gaps between cards/sections | spacing-scale step |
| `scrollbar.size` / `scrollbar.radius` | scrollbar gutter and thumb rounding | control tokens |
| `toast.duration` | auto-dismiss delay for success toasts | motion/duration token |

Look for CSS custom properties, a theme object, or a utility-framework config. If the
project has no tokens, propose a small set (as CSS custom properties) as part of the fix —
never scatter new pixel literals. Ratios (percent-of-viewport, aspect floors) stay ratios.

## 1. Structure rules (LAY)

**LAY-01 · Surface hierarchy · ERROR.**
Three overlay surface weights: full-screen subpage (heaviest) > side drawer > modal dialog
(lightest). A surface may only open surfaces of equal or lighter weight than itself, and a
modal dialog should be a leaf — it opens nothing further. Check by tracing which overlay
components each page/drawer/dialog component mounts or routes to.

**LAY-02 · Breadcrumb discipline · WARNING.**
Breadcrumb trails stay shallow and short: depth at most 10 levels (threshold, adjustable),
rendered width at most 60% of the content area, and trails near the cap collapse their
middle entries. Check the breadcrumb data source for a depth guard and the container for a
max-width constraint and collapse behavior.

**LAY-03 · Working-region framing · WARNING.**
The business content region carries one consistent outer frame (border or elevation) that
visually separates it from app chrome (header, menu). The region's size math must be exact
enough that no accidental extra scrollbar appears at the region boundary.

**LAY-04 · Dialog proportions · ERROR (size) / WARNING (placement).**
Dialog width comes from the role tokens: `dialog.sm` for alerts and confirms, `dialog.md`
for one-column entry forms, `dialog.lg` for two-column entry forms. Height is clamped to a
min/max band rather than left to grow unbounded, and the width:height ratio should not drop
below ~0.6 (a dialog taller than it is wide by much reads as a mis-sized drawer). Dialogs
are vertically centered. Check the dialog component's width/height bindings for literals
that bypass the tokens and for a centering prop/style.

**LAY-05 · Drawer proportions · WARNING.**
`drawer.narrow` for read-only detail and one-column content; `drawer.wide` for editing and
two-column content. A drawer never exceeds half the viewport width. Backdrop semantics
follow intent: read-only drawers render without a backdrop (the page behind stays live);
editing drawers use a backdrop that does **not** close on outside click (protects unsaved
input). No horizontal scrollbar may appear inside a drawer.

**LAY-06 · Pinned action area · ERROR.**
When a page body scrolls, its toolbar/action row stays pinned. Standard shape: the page is
a column flexbox; the toolbar gets `flex-shrink: 0`; the data area gets `flex: 1` plus
`overflow-y: auto`. Check that scrolling the data never moves the actions.

**LAY-07 · Leading-edge alignment · WARNING.**
The first tab in a tab strip and the first button in the toolbar share the same leading
inset (equal starting padding), so the page has one visual left rail. With no side
navigation, tabs and buttons align to the same edge.

**LAY-08 · Full-bleed coverage · ERROR.**
A full-screen subpage covers its parent completely — including the parent's tab strip —
and matches the app frame's outer margin. Check for full-height layout (`height: 100%`
or an equivalent flex fill) and stacking that actually occludes the parent.

**LAY-09 · Spacing rhythm · SUGGESTION.**
Gaps between sibling cards/sections come from the spacing scale (one `space.step`, commonly
the 16px-class step), and a divider separates the action area from the data area. Flag
one-off margins that sit outside the scale.

## 2. Interaction rules (INT)

**INT-01 · Quiet unified scrollbars · WARNING.**
One global scrollbar treatment for the whole app: thumb invisible at rest, revealed while
the pointer is over the scroll container, hidden again on leave; slim gutter and rounded
thumb from `scrollbar.*` tokens. Check for a single global definition (e.g. a
`::-webkit-scrollbar` block plus `scrollbar-width`/`scrollbar-color` for Firefox) rather
than per-component variants.

**INT-02 · Menu overflow behavior · WARNING.**
The navigation menu never scrolls horizontally. Labels wider than the menu column truncate
with an ellipsis and reveal the full text on hover. The menu column has a fixed token-bound
width and is not user-draggable.

**INT-03 · Notification policy · ERROR.**
Default to non-blocking toasts, placed top-center. Dismissal follows severity: success
auto-dismisses after `toast.duration` (3s-class); caution may auto-dismiss or offer manual
close; failure persists until the user dismisses it. Body text clamps to two lines with an
ellipsis; auto-dismiss pauses while hovered. Blocking confirm dialogs are reserved for
destructive or irreversible actions — flag informational uses of blocking dialogs.

**INT-04 · Hover affordance · SUGGESTION.**
Everything interactive answers the pointer: buttons shift tone, links underline or recolor,
table rows and tree nodes and dropdown options take a subtle hover wash (token-bound),
non-current breadcrumb links recolor, and hover-revealed controls (favorite/pin buttons on
menu leaves) appear. Check for `:hover` styles (or framework equivalents) on interactive
elements.

**INT-05 · Truncate and reveal · WARNING.**
Any width-constrained text truncates with an ellipsis **and** exposes the full value —
tooltip, `title` attribute, or hover popover. Applies to menu labels, tags, filter chips,
breadcrumbs, table cells. An element with `max-width` but no
`overflow: hidden; text-overflow: ellipsis` pair (or line-clamp) plus a reveal is a finding.

**INT-06 · Idle lock · SUGGESTION.**
If the app has an idle-lock feature: the timeout is user-configurable, users may shorten
but not exceed the administrator default, and while lock is enabled a separate hard
front-end session timeout is disabled (the lock replaces it).

**INT-07 · Display-unit switching · WARNING.**
Where numeric display scale is switchable (e.g. ones / thousands / millions of a currency),
the switch applies page-wide, the user's choice is remembered, child surfaces (drawers,
subpages) inherit the parent's scale and cannot diverge, and explicitly pinned fields opt
out. Check for a memory mechanism and for inheritance into child surfaces.

**INT-08 · Surface-state memory · SUGGESTION.**
Navigation collapse state, pane widths, and the default selected item persist across visits
(web storage or user profile) and restore on the next load.

## 3. Framework adaptation

Detection comes from the harness signals registry — do not re-implement it. Apply rules in
the detected idiom:

| Concern | React | Vue | Svelte | Angular |
|---|---|---|---|---|
| Overlay mounting | portals | `Teleport` / library dialog | portal action or library | CDK Overlay |
| Scoped styles | CSS Modules / styled / utility classes | SFC `<style scoped>` | component `<style>` | component styles / `:host` |
| Hover styles | pseudo-class in the styling layer | scoped `:hover` | scoped `:hover` | `:host(:hover)` / classes |
| Pinned toolbar | flex column in JSX | flex column in template | flex column in markup | flex column + host binding |
| State memory | hook + storage | composable + storage | store + storage | service + storage |

Component-library dialog/drawer/toast wrappers count: check the props they expose (width,
centered, backdrop, closable, duration) against the same roles.

## 4. Generation archetypes

Four page shapes this skill can scaffold, each built token-first in the detected framework
and self-audited against every LAY/INT rule before delivery:

1. **Workspace page** — optional tab strip, optional side navigation (fixed width,
   searchable, collapsible with memory), toolbar, collapsible filter panel, data table.
2. **Full-screen detail page** — breadcrumb, pinned action row, scrolling body, full-bleed
   over its parent (LAY-08).
3. **Drawer panel** — detail variant (`drawer.narrow`, no backdrop) and edit variant
   (`drawer.wide`, guarded backdrop), pinned footer actions.
4. **Modal dialog** — alert, confirm, and entry-form variants at `dialog.sm/md/lg`,
   centered, height-clamped.

Generation flow: pick archetype → fill with the caller's fields/columns → bind every
dimension to resolved tokens → run the LAY/INT self-audit → deliver code plus the audit
summary on `templates/output.md`.
