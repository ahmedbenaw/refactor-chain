# Worked example — bringing a search form + table onto the standard

Project signals: Vue 3 SFCs, token layer present (`--color-primary`,
`--color-danger`, `--font-size-body`, `--bg-row-alt`, …). Thresholds at defaults.

## Before

```vue
<template>
  <div class="search">
    <input v-model="q.name" />                             <!-- INP-1: required, no marker; no label -->
    <button style="background:#1890ff;color:#fff">Search</button> <!-- CLR-1/CLR-5: literal brand color -->
    <button style="background:#1890ff;color:#fff">Export</button> <!-- BTN-1: second primary -->
  </div>
  <table>
    <tr><th style="font-size:13px">Name</th><th>Amount</th></tr>  <!-- TYP-1: off-scale size; TBL-1: no row numbers -->
    <tr v-for="r in rows"><td>{{ r.name }}</td><td>{{ r.amount }}</td></tr> <!-- TYP-4/5: numbers left, unformatted -->
  </table>
</template>
```

Audit result: 3 ERROR (CLR-1, BTN-1, TBL-1 — TYP-1 also ERROR), 4 WARN. ERROR tier
blocks; fix plan confirmed.

## After

```vue
<template>
  <div class="search">
    <label for="name">Name <span class="req" aria-hidden="true">*</span></label>
    <input id="name" v-model="q.name" required placeholder="Enter a name to search" />
    <button class="btn-primary" :disabled="loading" aria-label="Search">
      {{ loading ? 'Searching…' : 'Search' }}                  <!-- BTN-6 loading state -->
    </button>
    <button class="btn-default" aria-label="Export results">Export</button> <!-- demoted: one primary per view -->
  </div>
  <table>
    <thead><tr><th scope="col">#</th><th scope="col">Name</th><th scope="col" class="num">Amount</th></tr></thead>
    <tbody>
      <tr v-for="(r, i) in rows" :key="r.id">
        <td>{{ i + 1 }}</td>                                    <!-- TBL-1 row numbers -->
        <td>{{ r.name }}</td>
        <td class="num">{{ formatAmount(r.amount) }}</td>       <!-- TYP-5 thousands + decimals -->
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.req { color: var(--color-danger); }                            /* INP-1 via the danger token */
.btn-primary { background: var(--color-primary); color: var(--color-on-primary); font-size: var(--font-size-body); }
.btn-default { border: 1px solid var(--color-border); font-size: var(--font-size-body); }
th { font-weight: 600; text-align: center; font-size: var(--font-size-body); } /* TYP-1/2, TBL-6 */
.num { text-align: right; }                                     /* TYP-4 numbers right */
tbody tr:nth-child(even) { background: var(--bg-row-alt); }     /* TBL-5 zebra via token */
</style>
```

## Why, rule by rule

- **CLR-1/CLR-5:** the literal was replaced by `--color-primary` because both the
  resolved value *and* the role (primary action) matched — the token-resolution
  policy, not a find-and-replace of one hex.
- **BTN-1:** two primary-styled buttons meant no visual hierarchy; Search is the main
  action, Export demoted to the default style. The threshold (1) is configurable — a
  project that allows 2 would only WARN here.
- **TBL-1 / TYP-4 / TYP-5:** row numbers added as the first column; amounts
  right-aligned and formatted.
- **Accessibility in output:** every control gained an associated label or
  `aria-label`, the required marker is announced through `required` (the asterisk is
  `aria-hidden`), and headers use `scope="col"` — generation recipes apply the same.
- **Behavior preserved:** `v-model` bindings, the search handler, and the data flow
  are untouched; only presentation and structure changed, and the after-code passed
  a re-audit with zero ERRORs.
