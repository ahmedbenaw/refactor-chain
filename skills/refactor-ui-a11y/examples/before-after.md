# Worked example — bringing a component to WCAG 2.2 AA

## Before

A "card action" block: low-contrast meta text, a clickable `<div>` (mouse-only, no name),
`outline:none` killing the focus ring, an icon-only button with no label, an image with no
`alt`, and a table that overflows on narrow screens.

```html
<div class="card">
  <img src="/chart.png">                                  <!-- no alt -->
  <h3>Q3 Report</h3>
  <p style="color:#9aa0a6">Updated 2 days ago</p>          <!-- #9aa0a6 on #fff ≈ 2.6:1 FAIL -->

  <div class="btn" onclick="openMenu()">⋯</div>            <!-- div, mouse-only, no name -->
  <button onclick="download()"><svg>…</svg></button>       <!-- icon-only, no accessible name -->

  <a href="/edit" style="outline:none">Edit</a>            <!-- focus ring removed -->

  <table class="wide">…12 columns…</table>                <!-- overflows at 320px -->
</div>
```
```html
<meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no">
```
Findings: 1.1.1 (missing alt), 1.4.3 (contrast 2.6 < 4.5), 4.1.2 (no name/role on menu &
download), 2.1.1 (div not keyboard-operable), 2.4.7 (no visible focus), 1.4.10 (no reflow),
1.4.4 (zoom blocked by `user-scalable=no`).

## After

```html
<div class="card">
  <img src="/chart.png" alt="Revenue rose 12% in Q3">      <!-- meaningful alt (1.1.1) -->
  <h3>Q3 Report</h3>
  <p class="meta">Updated 2 days ago</p>                    <!-- token snapped to a passing step -->

  <button class="btn" onclick="openMenu()" aria-haspopup="menu" aria-expanded="false">
    <span class="sr-only">More actions</span>⋯              <!-- real button + accessible name -->
  </button>
  <button onclick="download()" aria-label="Download report"><svg aria-hidden="true">…</svg></button>

  <a href="/edit">Edit</a>                                  <!-- focus ring restored below -->

  <div class="table-scroll" role="region" aria-label="Q3 data" tabindex="0">
    <table>…</table>                                        <!-- data table scrolls in its own region -->
  </div>
</div>
```
```css
.meta { color: var(--color-text-muted); }   /* mapped to a ramp step that is ≥4.5:1 on surface */
:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px; }  /* 2.4.7 + ≥3:1 */
.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0 0 0 0); border:0; }
/* card content reflows; only the wide DATA table scrolls, inside a labelled region (1.4.10) */
```
```html
<meta name="viewport" content="width=device-width, initial-scale=1">   <!-- zoom re-enabled (1.4.4) -->
```

## What each fix maps to
| Before | Criterion | Fix |
|---|---|---|
| `<img>` no alt | 1.1.1 | meaningful `alt` (or `alt=""` if decorative) |
| `#9aa0a6` meta ≈ 2.6:1 | 1.4.3 | snap `--color-text-muted` to a ramp step ≥4.5:1 |
| `<div onclick>` menu | 2.1.1, 4.1.2 | real `<button>` + `aria-haspopup`/`aria-expanded` + name |
| icon-only download | 4.1.2 | `aria-label`; decorative svg `aria-hidden` |
| `outline:none` | 2.4.7, 1.4.11 | `:focus-visible` ring using `--color-primary`, ≥3:1 |
| 12-col table overflow | 1.4.10 | reflow card; scope scroll to a labelled table region |
| `user-scalable=no` | 1.4.4 | remove it — zoom must work |

## Why this is better
- **Everyone can operate it** — keyboard reaches the menu, screen readers announce
  "More actions, menu" and "Download report", the chart is described.
- **Text is readable** — contrast passes AA, using a token step (no off-scale color).
- **Focus is visible** and the layout survives 320px and 200% zoom.
- **Content and behavior are unchanged** — same actions, same data, just reachable and perceivable.

## Gate verdict excerpt
```json
{ "standard": "WCAG 2.2 AA", "fixed": ["1.1.1","1.4.3","4.1.2","2.1.1","2.4.7","1.4.10","1.4.4"],
  "blockers": [], "verdict": "PASS" }
```
