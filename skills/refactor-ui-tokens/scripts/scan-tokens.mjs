#!/usr/bin/env node
// scan-tokens.mjs — zero-dep design-token scanner for refactor-ui-tokens.
// Collects literal visual values from CSS/SCSS/JSX/TSX/Vue/Svelte-ish source,
// buckets them by category, clusters near-duplicates, and prints JSON:
//   { files, categories: { color:[...], spacing:[...], ... }, drift: {...} }
//
// Usage:  node scan-tokens.mjs [dir]            (default: cwd)
//         node scan-tokens.mjs src/ --pretty
// No external deps. Heuristic, not a full CSS parser — good enough to inventory.

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const pretty = process.argv.includes('--pretty');
const EXTS = new Set(['.css', '.scss', '.sass', '.less', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte', '.styl']);
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'coverage', 'vendor']);

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir); } catch { return acc; }
  for (const name of entries) {
    if (IGNORE.has(name)) continue;
    const p = join(dir, name);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, acc);
    else if (EXTS.has(extname(p))) acc.push(p);
  }
  return acc;
}

const files = walk(root);
const hits = { color: {}, spacing: {}, fontSize: {}, fontWeight: {}, radius: {}, shadow: {}, zIndex: {}, duration: {} };
const bump = (cat, val) => { hits[cat][val] = (hits[cat][val] || 0) + 1; };

const RE = {
  hex: /#[0-9a-fA-F]{3,8}\b/g,
  rgb: /rgba?\([^)]*\)/g,
  hsl: /hsla?\([^)]*\)/g,
  spacing: /\b(?:margin|padding|gap|top|left|right|bottom|width|height)[^:;{]*:\s*([^;}\n]+)/gi,
  px: /\b(\d+(?:\.\d+)?)px\b/g,
  fontSize: /font-size\s*:\s*([^;}\n]+)/gi,
  fontWeight: /font-weight\s*:\s*(\d{3})/gi,
  radius: /border-radius\s*:\s*([^;}\n]+)/gi,
  shadow: /box-shadow\s*:\s*([^;}\n]+)/gi,
  zIndex: /z-index\s*:\s*(-?\d+)/gi,
  duration: /(?:transition|animation)[^:;{]*:\s*[^;}\n]*?(\d+(?:\.\d+)?m?s)/gi,
};

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  for (const m of src.matchAll(RE.hex)) bump('color', m[0].toLowerCase());
  for (const m of src.matchAll(RE.rgb)) bump('color', m[0].replace(/\s+/g, ''));
  for (const m of src.matchAll(RE.hsl)) bump('color', m[0].replace(/\s+/g, ''));
  for (const m of src.matchAll(RE.spacing)) for (const px of m[1].matchAll(RE.px)) bump('spacing', px[1] + 'px');
  for (const m of src.matchAll(RE.fontSize)) for (const px of m[1].matchAll(RE.px)) bump('fontSize', px[1] + 'px');
  for (const m of src.matchAll(RE.fontWeight)) bump('fontWeight', m[1]);
  for (const m of src.matchAll(RE.radius)) for (const px of m[1].matchAll(RE.px)) bump('radius', px[1] + 'px');
  for (const m of src.matchAll(RE.shadow)) bump('shadow', m[1].trim().replace(/\s+/g, ' '));
  for (const m of src.matchAll(RE.zIndex)) bump('zIndex', m[1]);
  for (const m of src.matchAll(RE.duration)) bump('duration', m[1]);
}

// cluster numeric categories: adjacent values within tolerance px collapse
function clusterNumeric(map, tol) {
  const nums = Object.keys(map).map((k) => ({ raw: k, n: parseFloat(k), c: map[k] }))
    .filter((x) => !Number.isNaN(x.n)).sort((a, b) => a.n - b.n);
  const clusters = [];
  for (const x of nums) {
    const last = clusters[clusters.length - 1];
    if (last && Math.abs(x.n - last.mode) <= tol) { last.members.push(x); if (x.c > last.modeCount) { last.mode = x.n; last.modeCount = x.c; } }
    else clusters.push({ mode: x.n, modeCount: x.c, members: [x] });
  }
  return clusters.map((cl) => ({ step: cl.mode + 'px', from: cl.members.map((m) => m.raw), collapsed: cl.members.length > 1 }));
}

const drift = {
  spacing_clusters: clusterNumeric(hits.spacing, 1),
  fontSize_clusters: clusterNumeric(hits.fontSize, 1),
  radius_clusters: clusterNumeric(hits.radius, 1),
  color_count: Object.keys(hits.color).length,
  orphans: Object.entries(hits.color).filter(([, c]) => c === 1).map(([v]) => v),
};

const out = { root, filesScanned: files.length, categories: hits, drift };
process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + '\n');
