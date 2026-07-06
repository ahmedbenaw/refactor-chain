# Worked example — visual refactor of a cluttered settings screen

One full pass through the procedure (feature first → low fidelity → systems → refine by concern →
polish last) on an invented app's settings screen. Content, labels, and behavior are untouched
throughout — only presentation changes.

## The starting point (before)

A single "Settings" page containing profile fields, notification toggles, a billing summary, and a
danger-zone delete button. Concrete problems as found:

- **Everything shouts.** The page title, four section headings, and every field label are all bold
  `#000` at nearly the same size (18–22px). The "Delete account" button is the same blue as "Save changes".
- **Arbitrary spacing.** Gaps measured between blocks: 7px, 10px, 13px, 18px, 22px, 25px — no two
  sections breathe the same way. Toggles sit 4px from their labels; sections sit 10px apart, so
  nothing groups visually.
- **No alignment system.** Labels are left-aligned, inputs are centered, the billing table is
  right-aligned; three different left edges down the page.
- **One-off colors.** Nine distinct grays (`#333`, `#3a3a3a`, `#444`, `#666`, `#6b6b6b`, `#777`,
  `#999`, `#aaa`, `#ccc`), two near-identical blues, and a red used only once — none from a palette.
- **Typography noise.** Body text at 13px/1.2 line-height feels cramped; helper text at 11px fails
  contrast at `#aaa` on white; two font families loaded but mixed mid-section.
- **Fake depth.** Every card has a different shadow, two of them implying light from below.

## The pass, step by step

### 1. Feature first
The unit refactored is the settings form itself — not the app shell, nav, or sidebar. Those are out
of scope and untouched.

### 2. Low fidelity first
All color and shadow stripped to grayscale; layout solved first. The four sections become stacked
cards on a single 640px column with one shared left edge.

### 3. Define restrictive systems (recorded before any refinement)
- **Spacing scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.
- **Type scale:** 12 / 14 / 16 / 20 / 24, line-height 1.5 for body, 1.25 for headings.
- **Color palette (HSL):** one primary blue `hsl(215 85% 45%)` with 3 tints; grays as 8 fixed steps
  of one hue `hsl(215 15% n%)`; one destructive red `hsl(354 70% 45%)`; nothing outside the palette.

### 4. Refine by concern — each change, with the why

| Change | Concern | Before | After | Why |
|---|---|---|---|---|
| De-emphasize section headings | hierarchy | 20px bold `#000`, same as page title | 14px semibold uppercase gray-600 | Secondary content should fit in, not compete — the fields are the content, headings are wayfinding |
| Make the primary action dominant | hierarchy | "Save changes" and "Delete account" both solid blue | Save = solid primary; Delete = ghost button in destructive red, moved into its own "Danger zone" card at page end | One clear primary action per screen; destructive actions must read as different in kind, not just position |
| Demote field labels | hierarchy | 16px bold black | 14px medium gray-700 above the input | Labels support inputs; bolding everything means nothing is bold |
| Group with space, not lines | layout/spacing | 10px between sections, 4px label-to-toggle, plus divider rules everywhere | 48 between cards, 24 inside cards, 8 label-to-control; dividers removed | Related things closer than unrelated things — proximity does the grouping, so the rules become redundant |
| Single alignment axis | layout/spacing | Three competing left edges | Everything keys to the card's left padding edge; billing numbers right-aligned within their column only | One axis makes the page scannable; tabular numerals stay right-aligned because that is how numbers compare |
| Whitespace over compression | layout/spacing | Full-width 1100px form rows | 640px max-width column, inputs sized to expected content (ZIP short, address long) | Line length and field width should signal expected input; dense ≠ efficient |
| Readable body text | typography | 13px/1.2 mixed families | 16px/1.5 body, 14px/1.5 secondary, one family | Below ~16px with tight leading, forms read as fine print; one family removes mid-section texture shifts |
| Helper text that passes | typography + color | 11px `#aaa` on white (≈2.3:1) | 14px gray-600 (≥4.5:1) | Accessibility contrast is a floor, not a preference |
| Palette-only colors | color | 9 grays, 2 blues, 1 stray red | 8-step single-hue gray ramp, 1 primary + tints, 1 destructive red | Every value picked from a scale; near-duplicates are decisions deferred, not choices made |
| Saturate the grays slightly | color | Pure neutral `#666`-style grays | Grays carry the primary hue at 15% saturation | Tinted grays make the palette cohesive instead of assembled |
| One light source | depth/polish | Mixed shadows, two lit from below | Single elevation token: `0 1px 3px` gray-900/12% on all cards | Consistent implied light reads as one physical space |

### 5. Polish last
Card radius unified to 8px (friendly but not playful — the app's chosen personality is
neutral/professional); focus rings switched to the primary tint; avatar placeholder replaced with a
properly masked real image. Done only after structure, type, and color were settled.

## After — what the screen is now

One 640px column, four calm cards, a single dominant "Save changes" action, a clearly separated
danger zone, three text sizes, one gray ramp, one blue, one red, one shadow. Every value on the
page traces to a scale defined in step 3.

## Keep / undo ledger

| Change | Verdict | Note |
|---|---|---|
| All twelve changes above | keep | Verified against the checklist below |
| Trial: icons added next to section headings | undo | Added texture without adding wayfinding — pure decoration, reverted |

## Verify (against the skill's checklist)

- Content, labels, and interactive behavior unchanged — every string and control action identical.
- No arbitrary values remain: all spacing/type/color audit back to the three scales.
- Hierarchy reads correctly: primary action dominant, secondary content de-emphasized.
- Contrast ≥ 4.5:1 for all text; palette cohesive (single-hue grays + primary + destructive).
- This was a full pass, not scoped — all five concerns touched; if it had been scoped (e.g.
  `--concern spacing`), only the spacing rows above would apply.
