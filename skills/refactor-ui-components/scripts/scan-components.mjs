#!/usr/bin/env node
// scan-components.mjs — heuristic bespoke-primitive scanner for refactor-ui-components.
// Finds hand-rolled UI primitives that a component registry (shadcn/ui) should replace,
// and counts divergent copies. Prints JSON: { findings:[...], duplicates:{...}, summary }.
// Zero deps. Heuristic — flags candidates to review.
//
// Usage: node scan-components.mjs [dir]   (default: cwd)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname, basename } from 'node:path';

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const pretty = process.argv.includes('--pretty');
const EXTS = new Set(['.tsx', '.jsx', '.ts', '.js', '.vue', '.svelte']);
const IGNORE = new Set(['node_modules', '.git', 'dist', 'build', 'out', '.next', 'components/ui']);

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

const files = walk(root);
const findings = [];
// track class strings per primitive kind to spot divergent copies
const buttonClasses = {};

const PATTERNS = [
  { kind: 'raw-button', re: /<button\b/g, hint: 'raw <button> — consider shadcn Button' },
  { kind: 'div-dialog', re: /role=["']dialog["']/g, hint: 'div-based dialog — consider shadcn Dialog' },
  { kind: 'click-on-nonbutton', re: /<(?:div|span|a)\b[^>]*onClick=/g, hint: 'onClick on non-button element — use Button/asChild' },
  { kind: 'raw-input', re: /<input\b(?![^>]*type=["'](?:hidden|radio|checkbox)["'])/g, hint: 'raw <input> — consider shadcn Input' },
  { kind: 'custom-dropdown', re: /className=["'][^"']*(?:dropdown|menu)[^"']*["']/g, hint: 'custom dropdown/menu markup — consider DropdownMenu' },
  { kind: 'custom-tabs', re: /className=["'][^"']*tab[^"']*["']/gi, hint: 'custom tabs markup — consider shadcn Tabs' },
  { kind: 'homemade-toast', re: /(?:toast|notification)[^=]*=\s*(?:useState|create)/gi, hint: 'homemade toast/notification — consider sonner' },
];

for (const f of files) {
  // skip the registry itself
  if (f.includes('/components/ui/') || f.includes('\\components\\ui\\')) continue;
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  for (const p of PATTERNS) {
    const matches = [...src.matchAll(p.re)];
    if (matches.length) findings.push({ file: f, kind: p.kind, count: matches.length, hint: p.hint });
  }
  // collect button class strings to detect drift
  for (const m of src.matchAll(/<button\b[^>]*className=["']([^"']+)["']/g)) {
    const key = m[1].split(/\s+/).slice(0, 6).sort().join(' ');
    (buttonClasses[key] ||= []).push(basename(f));
  }
}

const duplicates = {
  buttonVariants: Object.keys(buttonClasses).length,
  note: Object.keys(buttonClasses).length > 1
    ? `${Object.keys(buttonClasses).length} divergent button class-signatures — collapse to Button variants`
    : 'buttons consistent',
};

const summary = findings.reduce((a, x) => ((a[x.kind] = (a[x.kind] || 0) + x.count), a), {});
const out = { root, filesScanned: files.length, summary, duplicates, findings };
process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + '\n');
