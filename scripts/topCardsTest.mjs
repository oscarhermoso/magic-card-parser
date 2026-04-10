/**
 * Fetch top ~1000 cards by cube count from CubeCobra and test parser compatibility.
 *
 * Usage: node scripts/topCardsTest.mjs [--fetch] [--report]
 *   --fetch   Download cards from CubeCobra API (saves to scripts/topCards.json)
 *   --report  Run parser on cached cards and report results
 *   (default: both)
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { parseCard } from '../src/magicCardParser.js';

const CACHE_PATH = new URL('./topCards.json', import.meta.url);
const API_BASE = 'https://cubecobra.com/tool/api/topcards';
const FILTER = '-is%3Aub';
const PAGES = 11; // 11 pages × 96 = 1056, trim to 1000
const TARGET = 1000;

async function fetchCards() {
  const cards = [];
  for (let p = 0; p < PAGES && cards.length < TARGET; p++) {
    const url = `${API_BASE}?f=${FILTER}&p=${p}&s=Cube+Count&d=descending`;
    console.log(`Fetching page ${p}...`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} on page ${p}`);
    const json = await res.json();
    if (json.success !== 'true') throw new Error(`API error on page ${p}`);
    for (const card of json.data) {
      if (cards.length >= TARGET) break;
      cards.push({
        name: card.name,
        oracle_text: card.oracle_text ?? '',
        layout: card.layout ?? 'normal',
        cubeCount: card.cubeCount,
        type: card.type,
      });
    }
    // Be polite
    if (p < PAGES - 1) await new Promise(r => setTimeout(r, 500));
  }
  writeFileSync(CACHE_PATH, JSON.stringify(cards, null, 2));
  console.log(`Cached ${cards.length} cards to ${CACHE_PATH.pathname}`);
  return cards;
}

function runReport(cards) {
  const results = { ok: [], parseError: [], skipped: [] };

  for (const card of cards) {
    // Skip non-normal layouts (parser only supports normal)
    if (card.layout && card.layout !== 'normal') {
      results.skipped.push({ name: card.name, layout: card.layout });
      continue;
    }

    const r = parseCard({ name: card.name, oracle_text: card.oracle_text, layout: 'normal' });
    if (!r.error) {
      results.ok.push(card.name);
    } else {
      results.parseError.push({ name: card.name, error: String(r.error).slice(0, 120) });
    }
  }

  const total = cards.length;
  const normalCards = total - results.skipped.length;
  console.log(`\n=== Parser Compatibility Report ===`);
  console.log(`Total cards: ${total}`);
  console.log(`Skipped (non-normal layout): ${results.skipped.length}`);
  console.log(`Normal-layout cards tested: ${normalCards}`);
  console.log(`  Parsed OK: ${results.ok.length} (${pct(results.ok.length, normalCards)})`);
  console.log(`  Parse error: ${results.parseError.length} (${pct(results.parseError.length, normalCards)})`);

  if (results.skipped.length > 0) {
    const layoutCounts = {};
    for (const s of results.skipped) {
      layoutCounts[s.layout] = (layoutCounts[s.layout] || 0) + 1;
    }
    console.log(`\nSkipped layouts:`);
    for (const [layout, count] of Object.entries(layoutCounts).sort((a, b) => b[1] - a[1])) {
      console.log(`  ${layout}: ${count}`);
    }
  }

  if (results.parseError.length > 0) {
    console.log(`\nParse errors (first 50):`);
    for (const { name, error } of results.parseError.slice(0, 50)) {
      console.log(`  ${name}: ${error}`);
    }
  }

  return results;
}

function pct(n, total) {
  return total > 0 ? `${((n / total) * 100).toFixed(1)}%` : '0%';
}

// Main
const args = process.argv.slice(2);
const doFetch = args.includes('--fetch') || args.length === 0;
const doReport = args.includes('--report') || args.length === 0;

let cards;
if (doFetch || !existsSync(CACHE_PATH)) {
  cards = await fetchCards();
} else {
  cards = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  console.log(`Loaded ${cards.length} cached cards`);
}

if (doReport) {
  runReport(cards);
}
