#!/usr/bin/env node
// audit-mobile.mjs — heuristic mobile-UI auditor for refactor-ui-mobile.
// Scans SwiftUI / Compose / React Native / Flutter source for the three most
// common mobile-refactor findings:
//   1. undersized touch targets   (frame/size < 44pt iOS / 48dp Android)
//   2. missing safe-area handling  (no safe-area/window-inset API used)
//   3. hardcoded, non-scalable fonts (fixed font sizes instead of type styles)
// Prints JSON: { platformGuess, findings:[{file,kind,detail,line}], summary }
// Zero deps. Heuristic — flags candidates to review, not a compiler.
//
// Usage: node audit-mobile.mjs [dir]   (default: cwd)

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : '.';
const pretty = process.argv.includes('--pretty');
const EXTS = new Set(['.swift', '.kt', '.tsx', '.jsx', '.ts', '.js', '.dart']);
const IGNORE = new Set(['node_modules', '.git', 'build', 'dist', 'Pods', '.dart_tool', 'ios/build', 'android/build']);

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
const platformVotes = { ios: 0, android: 0, rn: 0, flutter: 0 };

const MIN = { swift: 44, kt: 48, dart: 44, tsx: 44, jsx: 44, ts: 44, js: 44 };

function safeAreaUsed(src, ext) {
  if (ext === '.swift') return /safeArea|safeAreaInset|safeAreaLayoutGuide|keyboardLayoutGuide/.test(src);
  if (ext === '.kt') return /safeDrawing|windowInsetsPadding|imePadding|WindowInsets|enableEdgeToEdge/.test(src);
  if (ext === '.dart') return /SafeArea|viewInsets|resizeToAvoidBottomInset/.test(src);
  return /SafeAreaView|useSafeAreaInsets|KeyboardAvoidingView|react-native-safe-area/.test(src); // RN
}

for (const f of files) {
  let src; try { src = readFileSync(f, 'utf8'); } catch { continue; }
  const ext = extname(f);
  const lines = src.split('\n');

  if (/import SwiftUI|UIViewController|UIKit/.test(src)) platformVotes.ios++;
  if (/androidx\.compose|android\./.test(src)) platformVotes.android++;
  if (/react-native/.test(src)) platformVotes.rn++;
  if (/package:flutter/.test(src)) platformVotes.flutter++;

  const min = MIN[ext.slice(1)] || 44;

  // 1. undersized targets: frame/size/height with a small number near an interactive symbol
  const targetRe = /(?:\.frame\(|\.size\(|width:|height:|minHeight:|minWidth:|size:\s*Size\(|SizedBox\()[^)\n]*?(\d{1,3})/g;
  const interactive = /(Button|IconButton|Pressable|TouchableOpacity|onTap|onClick|onPressed|GestureDetector|InkWell)/;
  lines.forEach((ln, i) => {
    if (!interactive.test(ln) && !interactive.test(lines[i - 1] || '') && !interactive.test(lines[i + 1] || '')) return;
    for (const m of ln.matchAll(targetRe)) {
      const n = parseInt(m[1], 10);
      if (n > 0 && n < min) findings.push({ file: f, kind: 'undersized-target', detail: `${n} < ${min} min`, line: i + 1 });
    }
  });

  // 2. missing safe area (only flag files that clearly render a screen)
  const rendersScreen = /(some View|Scaffold|@Composable|SafeArea|Widget build|StyleSheet\.create|export default function)/.test(src);
  if (rendersScreen && !safeAreaUsed(src, ext)) {
    findings.push({ file: f, kind: 'no-safe-area', detail: 'screen renders without any safe-area / window-inset API', line: 1 });
  }

  // 3. hardcoded fonts (fixed size instead of type style / sp / textTheme)
  const fontRe = ext === '.swift'
    ? /\.font\(\.system\(size:\s*(\d+)/g
    : ext === '.dart'
      ? /fontSize:\s*(\d+)/g
      : /fontSize:\s*(\d+)/g; // kt/rn
  lines.forEach((ln, i) => { for (const m of ln.matchAll(fontRe)) findings.push({ file: f, kind: 'fixed-font', detail: `fontSize ${m[1]} not a scalable text style`, line: i + 1 }); });
}

const platformGuess = Object.entries(platformVotes).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
const summary = findings.reduce((acc, x) => ((acc[x.kind] = (acc[x.kind] || 0) + 1), acc), {});
const out = { root, platformGuess, filesScanned: files.length, summary, findings };
process.stdout.write(JSON.stringify(out, null, pretty ? 2 : 0) + '\n');
