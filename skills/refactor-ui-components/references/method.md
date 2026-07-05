# Component-Library Adoption — full method

Exhaustive "how" behind `refactor-ui-components`. SKILL.md gives the 6-step spine.
Default registry: **shadcn/ui** (copy-in components you own, built on Radix primitives
+ Tailwind). The same approach generalizes to other registries.

## 0. When this applies
Web UI with hand-rolled primitives — custom `<button>` markup, div-based dropdowns/menus,
ad-hoc modals, homemade inputs/checkboxes/tabs/tooltips/toasts, or many divergent copies
of the same widget. If the project already uses a mature library correctly, this skill is
a no-op — verify and move on.

## 1. Inventory bespoke primitives
Categories to find and count divergent copies of:
- button, icon-button, input, textarea, select, checkbox, radio, switch
- dialog/modal, drawer/sheet, popover, dropdown-menu, tooltip
- tabs, accordion, toast/notification, badge, card, table, pagination
`scripts/scan-components.mjs` flags candidates (raw `<button>`, `role="dialog"` divs,
`onClick` on non-button elements, repeated near-identical class strings).

## 2. Registry & init — MCP vs CLI
**Prefer the shadcn MCP when connected** (`mcp__Shadcn_UI__*`):
- `list_components` / `list_blocks` / `list_themes` — see what's available.
- `get_component` / `get_component_demo` / `get_block` — fetch exact source + usage.
- `get_component_metadata` — dependencies and registry deps.
- `apply_theme` / `get_theme` — theme scaffolding.
Use the MCP to get authoritative, current source instead of guessing prop shapes.

**Without the MCP, use the CLI:**
```
npx shadcn@latest init        # creates components.json, cn(), base CSS vars
npx shadcn@latest add button dialog input select tabs   # add per primitive
```
Ensure present: `components.json`, the `cn()` util (`lib/utils`), Tailwind + the base
CSS-variable theme block shadcn expects.

## 3. Theme-variable → token mapping
shadcn themes via CSS variables. Map each to the **semantic token** from
`refactor-ui-tokens` so the library renders in the app's palette:

| shadcn variable | maps to token |
|---|---|
| `--background` / `--foreground` | `--color-surface` / `--color-text` |
| `--card` / `--card-foreground` | `--color-surface` / `--color-text` |
| `--primary` / `--primary-foreground` | `--color-primary` / `--color-on-primary` |
| `--secondary`, `--muted`, `--muted-foreground` | `--color-surface-alt`, `--color-text-muted` |
| `--border` / `--input` | `--color-border` |
| `--ring` | `--color-primary` (focus ring) |
| `--destructive` | `--color-danger` |
| `--radius` | `--radius-md` |

Do this once, centrally. Never ship shadcn's default slate/zinc look as the app's design.
If dark mode exists, map the `.dark` block to the token dark-theme values.

## 4. Per-primitive prop / behavior maps
Behavior must stay identical. For each swap, map the old surface to the new one:

**Bespoke button → `Button`**
| old | new |
|---|---|
| `onClick` | `onClick` |
| `disabled` | `disabled` |
| custom `primary/secondary/danger` class | `variant="default|secondary|destructive|outline|ghost"` |
| custom size class | `size="sm|default|lg|icon"` |
| homemade spinner state | compose: `<Button disabled>{loading && <Spinner/>}…</Button>` |
| `<a>` styled as button | `<Button asChild><a…></Button>` |

**Div-modal → `Dialog`**
| old | new |
|---|---|
| `isOpen` state | `<Dialog open={isOpen} onOpenChange={setOpen}>` |
| `onClose` | `onOpenChange(false)` |
| manual focus trap / ESC / overlay click | built in (Radix) — delete the hand-rolled versions |
| title/desc divs | `DialogTitle` / `DialogDescription` (also fixes a11y naming) |

**Custom select/dropdown → `Select` / `DropdownMenu`**: map value/onChange to
`value`/`onValueChange`; controlled stays controlled. **Custom tabs → `Tabs`**: active
key → `value`/`defaultValue`+`onValueChange`. **Homemade toast → `sonner`/`toast()`**.

Rule: if the registry lacks a behavior you need, **compose around** the component
(wrap it, pass children/render props) — do not fork the registry source.

## 5. Blocks for repeated page shapes
For forms, auth screens, dashboards, settings pages, data tables — adopt registry
**blocks** as the baseline (`get_block` via MCP, or `npx shadcn@latest add <block>`)
instead of re-composing markup by hand. Re-theme to tokens; wire real data/handlers.

## 6. Delete dead code
After call sites migrate and verify green, remove the old bespoke primitive and its
styles so there is exactly one source of truth. Check for dangling imports.

## Guardrail recap
Behavior identical (props/events/controlled state mapped 1:1). Theme to tokens, not
defaults. One primitive at a time, verified. Compose don't fork. Delete the dead
bespoke code. Accessibility improves for free but is still checked by refactor-ui-a11y.
