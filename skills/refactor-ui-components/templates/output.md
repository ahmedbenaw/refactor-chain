# Component-adoption report — scaffold

Fill in the placeholders. This is the report the skill produces after adopting a registry.

---

## Component library adoption — {{project / area}}

**Registry:** {{shadcn/ui}}  ·  **Source:** {{shadcn MCP | CLI `npx shadcn@latest`}}
**Prerequisite state:** tokens present ({{yes}}), visual/mobile pass done ({{yes}}).
**Scope:** swap bespoke primitives for registry components; behavior identical.

### You are here
Do-the-work · UI lane · components ({{N}} of {{M}}). Prev: tokens + visual/mobile. Next: refactor-ui-a11y.

---

### 1. Inventory (bespoke primitives found)
| Primitive | Bespoke copies | Files | Replace with |
|---|---|---|---|
| button | {{5}} | {{…}} | shadcn `Button` (variants) |
| dialog/modal | {{2}} | {{…}} | shadcn `Dialog` |
| {{input / select / tabs / …}} | {{}} | {{}} | {{}} |

(Paste `node scripts/scan-components.mjs <dir> --pretty` summary.)

### 2. Theme → token mapping
| shadcn variable | project token |
|---|---|
| `--primary` / `--primary-foreground` | {{--color-primary / --color-on-primary}} |
| `--background` / `--foreground` | {{--color-surface / --color-text}} |
| `--border` / `--input` / `--ring` | {{--color-border / … / --color-primary}} |
| `--destructive` | {{--color-danger}} |
| `--radius` | {{--radius-md}} |
| dark mode `.dark` block | {{mapped: yes/no}} |

### 3. Migration log (prop/behavior maps)
**{{Button}}**
| old prop/event | new | preserved? |
|---|---|---|
| {{onClick}} | {{onClick}} | ✓ |
| {{disabled}} | {{disabled}} | ✓ |
| {{loading}} | {{composed}} | ✓ |
| {{primary/secondary/danger}} | {{variant}} | ✓ |

**{{Dialog}}**
| old | new | preserved? |
|---|---|---|
| {{isOpen}} | {{open}} | ✓ |
| {{onClose}} | {{onOpenChange(false)}} | ✓ |
| {{hand-rolled focus trap / ESC}} | {{built-in — deleted}} | ✓ |

### 4. Blocks adopted
- {{form / auth / dashboard / data-table block}} → replaces {{hand-composed markup}}

### 5. Dead code removed
- {{PrimaryButton.tsx, ConfirmModal.tsx, …}} deleted; dangling imports: {{none}}.

---

### Verify results
- Plain: "{{Custom widgets are now standard components in your colors; everything does what it did.}}"
- Technical:
  - Build: {{pass}}
  - Prop/behavior maps satisfied (handlers fire, controlled state, variants): {{pass}}
  - Theme resolves to project tokens, no default leakage: {{pass}}
  - Old bespoke components deleted, no dangling imports: {{pass}}
  - Visual + interaction diff = intended standardization only: {{pass}}

### Open questions / deferred
- {{registry component missing a needed behavior → composed around it: …}}
