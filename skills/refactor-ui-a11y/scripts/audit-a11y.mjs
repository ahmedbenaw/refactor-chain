#!/usr/bin/env node
// audit-a11y.mjs — heuristic static accessibility auditor for refactor-ui-a11y.
// Catches the common, statically-detectable WCAG 2.2 AA defects:
//   - contrast: computes ratio for inline `color:#hex ... background:#hex` pairs
//   - missing alt on <img>, missing accessible name on icon-only buttons
//   - click handlers on non-button/non-anchor elements (keyboard 2.1.1)
//   - outline:none without a focus-visible replacement (2.4.7 smell)
//   - viewport that blocks zoom (user-scalable=no / maximum-scale) (1.4.4)
//   - positive tabindex (focus-order smell, 2.4.3)
// Prints JSON: { findings:[{file,criterion,detail,line}], summary }.
// Zero deps. Runtime checks (real DOM, screen reader) need a browser/axe tool.
//
// Usage: node audit-a11y.mjs [dir]   (default: cwd)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const pretty = process.argv.includes('--pretty');
const EXTS = new Set(['.html', '.htm', '.tsx', '.jsx', '.vue', '.svelte']);
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage']);

function walk(dir, acc = []) {
  let e; try { e = readdirSync(dir); } catch { return acc; }
  for (const name of e) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (EXTS.has(extname(p))) acc.push(p);
  }
  return acc;
}

// ---- contrast math (WCAG relative luminance) ----
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function ratio(a, b) {
  const [L1, L2] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (L1 + 0.05) / (L2 + 0.05);
}

const files = walk(root);
const findings = [];
const add = (file, criterion, detail, line) => findings.push({ file, criterion, detail, line });

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const lines = src.split('\n');

  lines.forEach((ln, i) => {
    const L = i + 1;
    // contrast: color + background hex in the same style attribute/block
    const color = ln.match(/color:\s*(#[0-9a-fA-F]{3,6})/);
    const bg = ln.match(/background(?:-color)?:\s*(#[0-9a-fA-F]{3,6})/) || (/#fff|#ffffff|white/.test(src) ? { 1: '#ffffff' } : null);
    if (color && bg) {
      const c = hexToRgb(color[1]); const b = hexToRgb(bg[1]);
      if (c && b) { const r = ratio(c, b); if (r < 4.5) add(f, '1.4.3', `contrast ${r.toFixed(2)}:1 < 4.5 (${color[1]} on ${bg[1]})`, L); }
    }
    // <img> without alt
    if (/<img\b/.test(ln) && !/\balt\s*=/.test(ln)) add(f, '1.1.1', '<img> missing alt', L);
    // icon-only button with no accessible name
    if (/<button\b/.test(ln) && !/aria-label|aria-labelledby/.test(ln) && /<button[^>]*>\s*<(?:svg|i|Icon)/.test(ln))
      add(f, '4.1.2', 'icon-only <button> without accessible name', L);
    // click on non-button/anchor
    if (/<(?:div|span)\b[^>]*onClick=/.test(ln) && !/role=/.test(ln)) add(f, '2.1.1', 'onClick on <div>/<span> (not keyboard-operable)', L);
    // outline:none without focus-visible in the same file
    if (/outline:\s*none/.test(ln) && !/:focus-visible/.test(src)) add(f, '2.4.7', 'outline:none with no :focus-visible replacement', L);
    // viewport blocking zoom
    if (/name=["']viewport["']/.test(ln) && /(user-scalable\s*=\s*no|maximum-scale\s*=\s*1)/.test(ln)) add(f, '1.4.4', 'viewport blocks zoom (user-scalable=no / maximum-scale=1)', L);
    // positive tabindex
    const ti = ln.match(/tabindex=["'](\d+)["']/i); if (ti && parseInt(ti[1], 10) > 0) add(f, '2.4.3', `positive tabindex=${ti[1]} (focus-order smell)`, L);
  });
}

const summary = findings.reduce((a, x) => ((a[x.criterion] = (a[x.criterion] || 0) + 1), a), {});
const out = { root, standard: 'WCAG 2.2 AA', filesScanned: files.length, summary, findings, note: 'static heuristics only; run axe/browser for runtime checks' };
process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + '\n');
