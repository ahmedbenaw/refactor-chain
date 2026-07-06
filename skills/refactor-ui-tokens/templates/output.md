# Token file scaffold — fill in the placeholders

Emit ONE of the following, matching the detected styling system. Replace every
`{{…}}` placeholder. Keep two tiers: **primitives** (raw scale) then **semantic
aliases** (roles). Components reference the semantic tier only.

---

## A. Plain CSS custom properties (`tokens.css`)

```css
:root {
  /* ── primitives: neutral ramp ── */
  --gray-0:  {{#ffffff}};
  --gray-50: {{}};   --gray-100: {{}};  --gray-200: {{}};  --gray-300: {{}};
  --gray-500:{{}};   --gray-700: {{}};  --gray-900: {{}};
  /* ── primitives: accents ── */
  --{{accent}}-400: {{}}; --{{accent}}-500: {{}}; --{{accent}}-600: {{}};
  /* ── primitives: spacing (4/8 scale) ── */
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --space-6: 24px; --space-8: 32px; --space-12: 48px;
  /* ── primitives: type scale ── */
  --text-xs: {{12px}}; --text-sm: {{14px}}; --text-md: {{16px}};
  --text-lg: {{18px}}; --text-xl: {{24px}}; --text-2xl: {{30px}};
  --font-normal: 400; --font-medium: 500; --font-semibold: 600; --font-bold: 700;
  --leading-tight: 1.25; --leading-normal: 1.5;
  /* ── primitives: radius / shadow / z / motion ── */
  --radius-sm: {{4px}}; --radius-md: {{6px}}; --radius-lg: {{12px}}; --radius-full: 9999px;
  --shadow-sm: {{0 1px 3px rgba(0,0,0,.12)}};
  --shadow-md: {{0 4px 12px rgba(0,0,0,.15)}};
  --z-dropdown: 1000; --z-modal: 1300; --z-toast: 1500;
  --duration-fast: 120ms; --duration-base: 200ms; --ease-standard: cubic-bezier(.2,0,0,1);

  /* ── semantic aliases: light theme ── */
  --color-surface:      var(--gray-0);
  --color-surface-alt:  var(--gray-50);
  --color-text:         var(--gray-900);
  --color-text-muted:   var(--gray-500);
  --color-border:       var(--gray-200);
  --color-primary:      var(--{{accent}}-500);
  --color-primary-hover:var(--{{accent}}-600);
  --color-on-primary:   var(--gray-0);
  --color-danger:       {{}};
  --color-success:      {{}};
}

/* dark theme: override the SEMANTIC tier only */
@media (prefers-color-scheme: dark) {
  :root {
    --color-surface: var(--gray-900);
    --color-text:    var(--gray-50);
    --color-border:  var(--gray-700);
    /* … */
  }
}
```

---

## B. Tailwind (`tailwind.config.js`)

```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        surface: 'var(--color-surface)',
        border:  'var(--color-border)',
        text: { DEFAULT: 'var(--color-text)', muted: 'var(--color-text-muted)' },
        primary: { DEFAULT: '{{#3b82f6}}', hover: '{{#2f6fe0}}' },
        danger: '{{}}', success: '{{}}',
      },
      spacing:      { 1:'4px', 2:'8px', 3:'12px', 4:'16px', 6:'24px', 8:'32px' },
      fontSize:     { xs:'12px', sm:'14px', md:'16px', lg:'18px', xl:'24px' },
      borderRadius: { sm:'4px', md:'6px', lg:'12px' },
      boxShadow:    { sm:'{{0 1px 3px rgba(0,0,0,.12)}}', md:'{{0 4px 12px rgba(0,0,0,.15)}}' },
    },
  },
};
```

---

## C. TS theme object (CSS-in-JS / React Native)

```ts
export const tokens = {
  color: {
    surface: '{{}}', text: '{{}}', textMuted: '{{}}', border: '{{}}',
    primary: '{{}}', primaryHover: '{{}}', onPrimary: '{{}}', danger: '{{}}',
  },
  space:  { 1: 4, 2: 8, 3: 12, 4: 16, 6: 24, 8: 32 } as const,
  font:   { xs: 12, sm: 14, md: 16, lg: 18, xl: 24 } as const,
  radius: { sm: 4, md: 6, lg: 12 } as const,
} as const;
export type Tokens = typeof tokens;
```

---

## D. SwiftUI / Jetpack Compose (sketch)

```swift
// SwiftUI — back colors with an asset catalog; expose semantic accessors
enum Theme {
  enum Color { static let surface = SwiftUI.Color("surface"); static let text = SwiftUI.Color("text"); static let primary = SwiftUI.Color("primary") }
  enum Space { static let s1: CGFloat = 4; static let s2: CGFloat = 8; static let s4: CGFloat = 16 }
  enum Radius { static let md: CGFloat = 6 }
}
```

```kotlin
// Compose — define in Theme.kt and expose via MaterialTheme.colorScheme
val LightColors = lightColorScheme(primary = Color(0xFF3B82F6), surface = Color(0xFFFFFFFF))
object Spacing { val s1 = 4.dp; val s2 = 8.dp; val s4 = 16.dp }
```

---

### Drift appendix (attach to the token PR)
```
Collapsed near-dupes: {{n}} → {{m}}   (list before → after)
Snapped (≤tolerance, confirmed):      {{13px→12px, …}}
Out-of-scale (left as-is, flagged):   {{…}}
Orphans (used once, not enshrined):   {{…}}
```
