/**
 * Grammar Rule Coverage Analysis
 *
 * Instruments nearley postprocessors to measure which grammar rules
 * are exercised by the test suite. Useful for identifying:
 * - Completely unused rules (candidates for removal to free compiler headroom)
 * - Partially used rules (may have dead alternatives)
 *
 * Usage:
 *   node scripts/coverage.mjs
 *
 * The nearley compiler (nearleyc) has a state-space limit that constrains
 * grammar size. Removing unused rules frees budget for new features.
 */

import nearley from '../node_modules/nearley/lib/nearley.js';
import grammar from '../src/generated/magicCardGrammar.cjs';
import { readFileSync } from 'fs';
import { replaceCardName } from '../src/nameReplacement.js';

// Instrument: wrap every postprocessor to track which rules fire
const usedRules = new Set();
const instrumentedRules = grammar.ParserRules.map((rule) => {
  const origPP = rule.postprocess;
  return {
    ...rule,
    postprocess: origPP
      ? function (...args) {
          usedRules.add(rule.name);
          return origPP.apply(this, args);
        }
      : function () {
          usedRules.add(rule.name);
          return arguments[0];
        },
  };
});

// Parse all test cards
const test = readFileSync(
  new URL('../__tests__/simpleIsBest.test.ts', import.meta.url),
  'utf8',
);
const lines = test.split('\n');
let ok = 0;

for (const line of lines) {
  const m = line.match(/name: '([^']+)'.*oracle_text: '((?:[^'\\]|\\.)*)'/);
  if (!m) continue;
  if (line.includes('parseError: true')) continue;
  const name = m[1];
  const oracle = m[2].replace(/\\n/g, '\n').replace(/\\'/g, "'");
  const processed = replaceCardName(oracle, name);

  const g = nearley.Grammar.fromCompiled({
    ...grammar,
    ParserRules: instrumentedRules,
  });
  const parser = new nearley.Parser(g);
  try {
    parser.feed(processed);
    if (parser.results.length > 0) ok++;
  } catch (e) {
    /* parseError cards — skip */
  }
}

// Aggregate by base rule name (strip $subexpression, $ebnf, $macrocall suffixes)
const allNames = new Set(grammar.ParserRules.map((r) => r.name));
const baseAll = {};
const baseUsed = {};
for (const name of allNames) {
  const base = name.replace(/\$.*/, '');
  baseAll[base] = (baseAll[base] || 0) + 1;
}
for (const name of usedRules) {
  const base = name.replace(/\$.*/, '');
  baseUsed[base] = (baseUsed[base] || 0) + 1;
}

// Report
console.log(`Parsed ${ok} cards`);
console.log(
  `Rules: ${allNames.size} total, ${usedRules.size} used (${Math.round((usedRules.size / allNames.size) * 100)}%)`,
);

const unused = [];
for (const [base, total] of Object.entries(baseAll)) {
  if (!baseUsed[base]) unused.push({ base, total });
}
unused.sort((a, b) => b.total - a.total);
console.log(
  `\n=== Completely UNUSED (${unused.length} base rules, ${unused.reduce((s, u) => s + u.total, 0)} compiled rules): ===`,
);
for (const { base, total } of unused)
  console.log(`  ${String(total).padStart(3)}  ${base}`);

const partial = [];
for (const [base, total] of Object.entries(baseAll)) {
  const used = baseUsed[base] || 0;
  if (used > 0 && used < total)
    partial.push({
      base,
      used,
      total,
      pct: Math.round((used / total) * 100),
    });
}
partial.sort((a, b) => a.pct - b.pct);
console.log(
  `\n=== Partially used (${partial.length}, lowest coverage first): ===`,
);
for (const { base, used, total, pct } of partial.slice(0, 25))
  console.log(`  ${String(pct).padStart(3)}% (${used}/${total})  ${base}`);
