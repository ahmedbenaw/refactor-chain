# Mobile UI refactor report — scaffold

Fill in the placeholders. This is the report the skill produces after a mobile UI pass.

---

## Mobile UI refactor — {{Screen / feature name}}

**Platform:** {{iOS | Android | cross-platform}}  ·  **Framework:** {{SwiftUI | UIKit | Compose | React Native | Flutter}}
**Convention set applied:** {{Apple HIG | Material 3 | both, per-OS}}
**Scope:** presentation only — content, data, behavior, and navigation destinations preserved.

### You are here
Do-the-work · UI lane · **mobile branch** ({{N}} of {{M}}). Prev: refactor-ui-tokens. Next: refactor-ui-components.

---

### 1. Touch targets
| Element | Before | After | Fix |
|---|---|---|---|
| {{back button}} | {{24pt}} | {{≥44pt}} | {{frame minHeight/minWidth + contentShape}} |
| {{…}} | {{}} | {{}} | {{}} |

Minimum enforced: **{{44pt iOS / 48dp Android}}**. Adjacent-target spacing: {{ok / fixed to 8dp}}.

### 2. Safe areas & keyboard
- Top (notch/status/Dynamic Island): {{was under → now inset via …}}
- Bottom (home indicator/nav bar): {{…}}
- Keyboard (IME): {{content lifted via imePadding / KeyboardAvoidingView / viewInsets}}
- Blanket `ignoresSafeArea` removed / scoped to background only: {{yes/no}}

### 3. Navigation
- Pattern before: {{ported desktop sidebar / drawer / custom}}
- Pattern after: {{iOS tab bar + navigation stack + back-swipe | Android bottom nav + system back}}
- Destinations unchanged: {{confirmed}}

### 4. Scalable type & density
- Text now uses: {{Dynamic Type styles | sp + textTheme | allowFontScaling}}
- Tested at largest text size without truncation/overlap: {{yes/no}}
- Spacing/type sourced from tokens: {{yes}}

### 5. Platform polish
- {{motion/easing, control styles, haptics, list affordances}}

---

### Verify results
- Plain: "{{Buttons are easy to tap, nothing hides under the notch or home bar, navigation feels native, text scales. Same content.}}"
- Technical:
  - Interactive frames ≥ {{44pt/48dp}}: {{pass}}
  - Safe-area/window-insets on notched + gesture-nav device: {{pass}}
  - Native navigation components in use: {{pass}}
  - Largest Dynamic Type / 200% font-scale: {{pass}}
  - Snapshot/preview diff = intended changes only: {{pass}}

### Audit script output
```json
{{ paste `node scripts/audit-mobile.mjs <dir> --pretty` summary here }}
```

### Open questions / deferred
- {{e.g. brand-unified look across platforms? confirm before mixing controls}}
