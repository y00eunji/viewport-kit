#!/usr/bin/env node
/**
 * audit-breakpoints — find breakpoint drift. No dependencies.
 *
 *   node audit-breakpoints.mjs [srcDir] [--tokens <dir>] [--quiet]
 *
 * Exit code: 0 = clean, 1 = findings. Drop it into CI as-is.
 */

import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join, basename, extname } from 'node:path';

const argv = process.argv.slice(2);
const quiet = argv.includes('--quiet');
const tokensFlag = argv.indexOf('--tokens');
const tokensDir = tokensFlag !== -1 ? argv[tokensFlag + 1] : null;
const srcDir = argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--tokens') ?? 'src';

const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.next', '.git', 'coverage']);
const EXTS = new Set(['.css', '.scss', '.less', '.ts', '.tsx', '.js', '.jsx', '.vue']);

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) walk(full, out);
    } else if (EXTS.has(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// ---------------------------------------------------------------- check 1
// Hardcoded lengths inside query conditions.

const QUERY = /@(media|container)\b([^{]*)\{/g;
const LENGTH = /(\d+(?:\.\d+)?)(px|rem|em)\b/g;

const mediaHits = new Map();     // "768px" -> [ "src/a.css:12", ... ]
const containerHits = new Map();

function record(map, value, where) {
  if (!map.has(value)) map.set(value, []);
  map.get(value).push(where);
}

const files = walk(srcDir);

for (const file of files) {
  // The token files are where these values are SUPPOSED to live.
  if (basename(file).toLowerCase().includes('breakpoint')) continue;

  const source = readFileSync(file, 'utf8');
  QUERY.lastIndex = 0;
  let m;
  while ((m = QUERY.exec(source)) !== null) {
    const [, kind, condition] = m;
    const line = source.slice(0, m.index).split('\n').length;
    LENGTH.lastIndex = 0;
    let l;
    while ((l = LENGTH.exec(condition)) !== null) {
      const value = l[1] + l[2];
      record(kind === 'media' ? mediaHits : containerHits, value, `${file}:${line}`);
    }
  }
}

// ---------------------------------------------------------------- check 2
// CSS/TS token drift.

function findToken(name) {
  if (tokensDir) {
    const p = join(tokensDir, name);
    return existsSync(p) ? p : null;
  }
  return files.find((f) => basename(f) === name) ?? null;
}

const cssTokenFile = findToken('breakpoints.css');
const tsTokenFile = findToken('breakpoints.ts');
const drift = [];
let driftChecked = false;

if (cssTokenFile && tsTokenFile) {
  driftChecked = true;
  const cssSource = readFileSync(cssTokenFile, 'utf8');
  const tsSource = readFileSync(tsTokenFile, 'utf8');

  const cssTokens = new Map();
  const CUSTOM_MEDIA = /@custom-media\s+--(\w+)\s+\(width >= ([\d.]+rem)\)/g;
  let c;
  while ((c = CUSTOM_MEDIA.exec(cssSource)) !== null) cssTokens.set(c[1], c[2]);

  const tsTokens = new Map();
  const block = tsSource.match(/BREAKPOINTS\s*=\s*\{([\s\S]*?)\}/);
  if (block) {
    const ENTRY = /['"]?([\w-]+)['"]?\s*:\s*['"]([\d.]+rem)['"]/g;
    let t;
    while ((t = ENTRY.exec(block[1])) !== null) tsTokens.set(t[1], t[2]);
  }

  for (const name of new Set([...cssTokens.keys(), ...tsTokens.keys()])) {
    const css = cssTokens.get(name);
    const ts = tsTokens.get(name);
    if (css !== ts) drift.push(`${name} — css ${css ?? '(missing)'} vs ts ${ts ?? '(missing)'}`);
  }
}

// ---------------------------------------------------------------- report

const log = (...args) => { if (!quiet) console.log(...args); };
const byCount = (map) => [...map.entries()].sort((a, b) => b[1].length - a[1].length);

log(`\nscanned ${files.length} file(s) under ${srcDir}\n`);

if (mediaHits.size) {
  log('FAIL  hardcoded lengths in @media conditions');
  for (const [value, places] of byCount(mediaHits)) {
    log(`  ${value}  ×${places.length}`);
    for (const p of places.slice(0, 5)) log(`      ${p}`);
    if (places.length > 5) log(`      … ${places.length - 5} more`);
  }
  log('\n  Replace with @custom-media from breakpoints.css.');
  log('  Clusters like 767/768/769 are the same intention re-derived rather than');
  log('  reused — each one is a place the design can drift out from under you.\n');
} else {
  log('ok    no hardcoded lengths in @media conditions');
}

if (containerHits.size) {
  // Informational, never a failure. Container thresholds are component-local by
  // design: the width a card needs is a property of the card, not of the app's
  // breakpoint scale. Failing on these floods the report and gets the script
  // ignored — which costs more than the noise saves.
  log('\ninfo  container query thresholds (component-local, not drift)');
  for (const [value, places] of byCount(containerHits)) {
    log(`  ${value}  ×${places.length}  ${places[0]}${places.length > 1 ? ' …' : ''}`);
  }
}

log('');
if (!driftChecked) {
  log('skip  token drift — breakpoints.css and/or breakpoints.ts not found');
  log('      (token layer not set up yet; run Step 2 of the skill first)');
} else if (drift.length) {
  log('FAIL  css/ts token drift');
  for (const d of drift) log(`  ${d}`);
} else {
  log('ok    css and ts tokens agree');
}
log('');

process.exit(mediaHits.size || drift.length ? 1 : 0);
