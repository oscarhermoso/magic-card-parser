#!/usr/bin/env node
// Quick assessment of parse success/failure for simple-is-best cube
import { parseCard } from '../src/magicCardParser.js';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const cards = require('/home/oscarhermoso/Git/mtg-cube-simulator/src/cards.json');

let success = 0, failed = 0;
const failedCards = [];

for (const card of cards) {
  const text = card.text || '';
  if (!text) { success++; continue; }
  const result = parseCard({ name: card.name, oracle_text: text, layout: 'normal' });
  if (result.error) {
    failed++;
    failedCards.push(card.name);
  } else {
    success++;
  }
}

console.log(`Success: ${success} | Failed: ${failed}`);
if (process.argv.includes('-v')) {
  console.log('\nFailed:', failedCards.join(', '));
}
