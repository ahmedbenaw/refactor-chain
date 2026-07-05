# Worked example — extracting tokens from a scattered card component

## Before

A `Card` component styled with inline literals. Note the drift: three near-identical
grays, two blues, non-scale spacing (`13px`, `18px`), and a one-off radius.

```css
/* card.css — BEFORE */
.card {
  background: #ffffff;
  color: #1a1d21;               /* near-black A */
  border: 1px solid #e4e6e9;    /* gray A */
  border-radius: 6px;
  padding: 18px;                /* off-scale */
  box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}
.card__title  { font-size: 18px; font-weight: 600; color: #16191d; } /* near-black B */
.card__meta   { font-size: 13px; color: #6b7280; margin-top: 4px; }  /* off-scale size */
.card__cta    { background: #3b82f6; color: #fff; padding: 8px 13px; border-radius: 6px; }
.card__cta:hover { background: #2f6fe0; }  /* second blue */
```

Inventory (from `scan-tokens.mjs`): 3 near-black grays, 1 mid gray, 2 blues,
spacing `{4,8,13,18}`, font-size `{13,18}`, radius `{6}`.

## After — CSS variables

Cluster: the three near-blacks collapse to one `--gray-900`; `13px`→`12px`,
`18px`→`16px` (both confirmed in the drift table, ≤2px); `6px` becomes `--radius-md`.
The two blues stay as `500`/`600` steps of one accent.

```css
/* tokens.css */
:root {
  /* primitives */
  --gray-0: #ffffff;  --gray-100: #e4e6e9;  --gray-500: #6b7280;  --gray-900: #16191d;
  --blue-500: #3b82f6; --blue-600: #2f6fe0;
  --space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
  --text-sm: 12px; --text-lg: 18px;
  --radius-md: 6px;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.12);
  /* semantic aliases */
  --color-surface: var(--gray-0);
  --color-text: var(--gray-900);
  --color-text-muted: var(--gray-500);
  --color-border: var(--gray-100);
  --color-primary: var(--blue-500);
  --color-primary-hover: var(--blue-600);
  --color-on-primary: var(--gray-0);
}
```

```css
/* card.css — AFTER (references semantic tokens only) */
.card {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);              /* 18→16, confirmed */
  box-shadow: var(--shadow-sm);
}
.card__title { font-size: var(--text-lg); font-weight: 600; color: var(--color-text); }
.card__meta  { font-size: var(--text-sm); color: var(--color-text-muted); margin-top: var(--space-1); } /* 13→12 */
.card__cta   { background: var(--color-primary); color: var(--color-on-primary); padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); }
.card__cta:hover { background: var(--color-primary-hover); }
```

## After — Tailwind variant (same tokens, different home)

```js
// tailwind.config.js
module.exports = { theme: { extend: {
  colors: {
    surface: 'var(--color-surface)', border: 'var(--color-border)',
    primary: { DEFAULT: '#3b82f6', hover: '#2f6fe0' },
    text: { DEFAULT: '#16191d', muted: '#6b7280' },
  },
  spacing: { 1:'4px', 2:'8px', 3:'12px', 4:'16px' },
  fontSize: { sm:'12px', lg:'18px' },
  borderRadius: { md:'6px' },
  boxShadow: { sm:'0 1px 3px rgba(0,0,0,0.12)' },
}}};
```

```html
<!-- markup -->
<div class="bg-surface text-text border border-border rounded-md p-4 shadow-sm">
  <h3 class="text-lg font-semibold text-text">Title</h3>
  <p class="text-sm text-text-muted mt-1">Meta</p>
  <button class="bg-primary hover:bg-primary-hover text-white px-3 py-2 rounded-md">CTA</button>
</div>
```

## Why this is better
- **6 grays/blues → a named ramp.** Future "make it darker" is one token edit, not a grep.
- **Off-scale `13/18px` snapped to the scale** (≤2px, confirmed) — spacing is now rhythmic.
- **Components reference roles** (`--color-text`), so dark mode is a semantic-tier swap.
- **Drift is now visible:** the report says "collapsed 3 near-blacks, snapped 13→12 and
  18→16" — the next visual step starts from a clean, named vocabulary.

## Drift report excerpt
```json
{ "near_dupes": [{ "cluster": "near-black", "from": ["#1a1d21","#16191d"], "to": "--gray-900" }],
  "snapped":    [{ "from": "13px", "to": "12px", "delta": 1 }, { "from": "18px", "to": "16px", "delta": 2 }],
  "orphans":    [], "out_of_scale": [] }
```
