#!/usr/bin/env node
// Quick assessment of parse success/ambiguity/failure for simple-is-best cube
const { parseCard } = require('../src/magicCardParser');
const cards = require('/home/oscarhermoso/Git/mtg-cube-simulator/src/cards.json');

let success = 0, ambiguous = 0, failed = 0;
const ambiguousCards = [];
const failedCards = [];

for (const card of cards) {
  const text = card.text || '';
  if (!text) { success++; continue; }
  const result = parseCard({ name: card.name, oracle_text: text, layout: 'normal' });
  if (result.error === 'Ambiguous parse') {
    ambiguous++;
    ambiguousCards.push({ name: card.name, parses: result.result.length });
  } else if (result.error) {
    failed++;
    failedCards.push(card.name);
  } else {
    success++;
  }
}

console.log(`Success: ${success} | Ambiguous: ${ambiguous} | Failed: ${failed} | Ratio: ${(success/ambiguous).toFixed(1)}:1`);
if (process.argv.includes('-v')) {
  console.log('\nAmbiguous:', ambiguousCards.sort((a,b) => b.parses - a.parses).map(c => `${c.name}(${c.parses})`).join(', '));
  console.log('\nFailed:', failedCards.join(', '));
}
