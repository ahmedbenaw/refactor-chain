---
name: refactor-ui-components
description: "Use this skill when a web UI is full of hand-rolled, bespoke primitives (custom <button> markup, div-based dropdowns, ad-hoc modals, homemade inputs/tabs/dialogs) and the user wants to \"adopt shadcn/ui\", \"use a real component library\", \"replace our custom components with a registry\", \"stop reinventing buttons\", or \"standardize our UI components\". It swaps bespoke primitives for registry components (shadcn/ui first), wires their theme to the project's design tokens, and keeps behavior identical. This is a do-the-work step of the UI lane in the refactor-chain pipeline; it runs after refactor-ui-tokens (and after the visual/mobile pass) and before refactor-ui-a11y. It may use the shadcn MCP when available. Presentation-and-structure refactor: same behavior, standardized components."
---

# Component-Library Adopter (shadcn-first) — refactor-chain · do-the-work (UI)

**Bundle:** refactor-chain (self-diagnosing, self-healing fix-it pipeline).
**Phase:** do-the-work (UI lane) · **Prerequisite:** refactor-ui-tokens (and the visual/mobile pass) · **Next:** refactor-ui-a11y → refactor-code-principles.
**Adaptivity / conditional:** activates on web UIs with bespoke primitives. shadcn/ui is the default registry; may use the **shadcn MCP** (`mcp__Shadcn_UI__*`) when connected to list/fetch components, blocks, and themes.

## Purpose
Stop hand-rolling UI primitives. Replace bespoke buttons, inputs, dropdowns, dialogs, tabs, and the like with battle-tested registry components — **shadcn/ui first** — that already handle focus, keyboard, ARIA, and edge cases you'd otherwise reinvent (usually badly). Wire the registry's theme to the design tokens from `refactor-ui-tokens` so the adopted components look like *your* app, and keep every behavior identical so nothing the user does changes. This also covers the web-artifact pattern set: composing pages from registry blocks instead of one-off markup.

## When to use
- Trigger phrases: "adopt shadcn/ui", "use a real component library", "replace our custom components", "stop reinventing buttons/modals/dropdowns", "standardize our components", "build this from shadcn blocks", "these hand-made primitives are inconsistent".
- After tokens and the visual/mobile pass exist, so the registry theme can be wired to real tokens.
- When the diagnostic pass flags many divergent copies of the same primitive.

## What I'll tell you (plain-language / ADHD-friendly)
- "You've got five slightly-different custom buttons. I'll swap them for one proper button component and theme it to match your colors. It'll click and look the same — just consistent everywhere."
- "You are here: components step of the UI cleanup. Tokens + visual are done; accessibility is next."
- "I'll do one primitive at a time — buttons first. I'll show you the before/after and the behavior it keeps (loading state, disabled, onClick) before replacing it. OK to start?"
- "shadcn components ship with keyboard and screen-reader support built in, so this also removes a pile of hidden bugs — but the a11y gate later still double-checks."
- "That dialog swap changed a focus behavior — I undid it and I'm mapping your old `onClose` onto the registry's `onOpenChange` instead (attempt 2 of 3)."
- "Want the technical details? I can show the registry diff, the theme mapping to your tokens, and the prop-to-prop behavior map."

## Method
1. **Inventory bespoke primitives.** Find hand-rolled buttons, inputs, selects, checkboxes, dialogs/modals, dropdowns/menus, tabs, tooltips, toasts — and count divergent copies of each. `scripts/scan-components.mjs` lists candidates and their variants.
2. **Pick the registry & init.** Default **shadcn/ui**. If the shadcn MCP is connected, use it to list components/blocks/themes and fetch exact source; otherwise use the CLI (`npx shadcn@latest add …`). Ensure the project is initialized (`components.json`, `cn()` util, base styles).
3. **Wire the theme to tokens.** Map the registry's CSS-variable theme (`--primary`, `--background`, `--radius`, …) onto the semantic tokens produced by `refactor-ui-tokens`. The library should render in *your* palette, not its default.
4. **Migrate one primitive at a time.** Replace bespoke usage with the registry component. Build a **prop/behavior map**: every prop, event, and state the old component exposed (`onClick`, `disabled`, `loading`, `variant`, controlled/uncontrolled) maps to an equivalent — behavior stays identical.
5. **Compose blocks where they fit.** For repeated page shapes (forms, auth screens, dashboards, tables), adopt registry **blocks** as the new baseline instead of hand-composing.
6. **Delete the dead bespoke code.** Once call sites are migrated and verified, remove the old primitive so there's one source of truth.

See `references/method.md` for the shadcn init details, MCP-vs-CLI decision, theme-variable mapping table, and the per-primitive prop/behavior maps.

## Guardrails
- **Behavior identical.** Same click/keyboard/submit results, same controlled/uncontrolled semantics, same events firing. This is a swap, not a redesign of what things do.
- Theme the registry to the project's tokens — never ship the library's default look as if it were the app's design.
- Migrate and verify one primitive before starting the next; don't bulk-replace blind.
- Keep custom behavior the registry lacks by composing around the registry component, not by forking it.
- Don't hand-fork registry source when a prop/variant already covers the need.

## Verify
- Plain: "Your custom widgets are now standard components in your colors, and everything still does exactly what it did."
- Technical: app builds; each migrated primitive's prop/behavior map is satisfied (event handlers fire, controlled state works, variants render); registry theme resolves to the project tokens (no default-theme leakage); old bespoke component is deleted with no dangling imports; visual + interaction diff shows only the intended standardization.

## Resources
- `references/method.md` — shadcn init, MCP vs CLI, theme-variable→token mapping, per-primitive prop maps.
- `examples/before-after.md` — a bespoke `<button>` and a div-modal migrated to shadcn Button + Dialog.
- `scripts/scan-components.mjs` — heuristic scanner for bespoke primitives and their divergent copies.
- `scripts/checklist.mjs` — prints this skill's checklist as JSON.
- `templates/output.md` — the component-adoption report scaffold (inventory + prop maps + theme mapping).

## Chain position
A do-the-work step of the UI lane, after refactor-ui-tokens and the visual/mobile pass. Feeds refactor-ui-a11y (which then gates), then refactor-code-principles + the review gate. May call the shadcn MCP when available.
