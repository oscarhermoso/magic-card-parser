// @ts-nocheck — data-driven test file; type narrowing not needed
/**
 * Coverage test: parse the 50-card cube fixture and enforce confidence baselines.
 *
 * Thresholds (fail CI on regression):
 *   - Overall average confidence >= 0.85 across all 50 cards
 *   - No card has per-card average confidence < 0.5
 *   - Normal layout: >= 90% of cards at confidence >= 0.9
 *   - Adventure, transform, split, modal_dfc: all cards parseable (confidence > 0)
 *
 * Fixture: __tests__/fixtures/cube-sample.json
 *   50 representative cube cards across normal, adventure, transform, modal_dfc, split layouts.
 */

import { describe, it, expect } from 'vitest';
import { parseFaces } from '../src/magicCardParser.js';
import cubeFixture from './fixtures/cube-sample.json';

interface CardEntry {
  name: string;
  oracle_text: string;
  layout: string;
  card_faces?: Array<{ name: string; oracle_text: string }>;
}

interface CardCoverageResult {
  name: string;
  layout: string;
  avgConfidence: number;
  faceConfidences: number[];
  unknownClauses: string[];
}

function parseAllCards(cards: CardEntry[]): CardCoverageResult[] {
  return cards.map((card) => {
    const result = parseFaces(card as any);
    const faceConfidences = result.faces.map((f) => f.result.confidence);
    const avgConfidence =
      faceConfidences.reduce((a, b) => a + b, 0) / faceConfidences.length;
    return {
      name: card.name,
      layout: card.layout,
      avgConfidence,
      faceConfidences,
      unknownClauses: result.faces.flatMap((f) => f.result.unknownClauses),
    };
  });
}

function printCoverageTable(results: CardCoverageResult[]): void {
  console.log('\n--- Coverage Report ---');
  console.log(
    ['Card Name'.padEnd(50), 'Layout'.padEnd(12), 'Confidence', 'Unknown Clauses'].join(' | '),
  );
  console.log('-'.repeat(100));
  for (const r of results) {
    const confStr = r.avgConfidence.toFixed(2);
    const unknowns = r.unknownClauses.length > 0 ? r.unknownClauses.length.toString() : '-';
    console.log(
      [r.name.slice(0, 49).padEnd(50), r.layout.padEnd(12), confStr.padEnd(10), unknowns].join(
        ' | ',
      ),
    );
  }
  console.log('-'.repeat(100));
}

describe('coverage: cube fixture confidence baselines', () => {
  const results = parseAllCards(cubeFixture as CardEntry[]);

  it('prints per-card breakdown', () => {
    printCoverageTable(results);
    // Always passes — diagnostic output only
    expect(results).toHaveLength(50);
  });

  it('overall average confidence >= 0.85', () => {
    const avg = results.reduce((s, r) => s + r.avgConfidence, 0) / results.length;
    console.log(`\nOverall average confidence: ${avg.toFixed(3)}`);
    expect(avg).toBeGreaterThanOrEqual(0.85);
  });

  it('no card has average confidence < 0.5', () => {
    const failing = results.filter((r) => r.avgConfidence < 0.5);
    if (failing.length > 0) {
      console.error('Cards below 0.5 confidence:');
      for (const r of failing) {
        console.error(`  ${r.name} (${r.layout}): ${r.avgConfidence.toFixed(2)}`);
        console.error(`    Unknown clauses: ${r.unknownClauses.join('; ').slice(0, 120)}`);
      }
    }
    expect(failing).toHaveLength(0);
  });

  it('normal layout: >= 90% of cards have confidence >= 0.9', () => {
    const normal = results.filter((r) => r.layout === 'normal');
    const highConf = normal.filter((r) => r.avgConfidence >= 0.9);
    const pct = highConf.length / normal.length;
    const failing = normal.filter((r) => r.avgConfidence < 0.9);
    if (failing.length > 0) {
      console.log('Normal cards below 0.9 confidence:');
      for (const r of failing) {
        console.log(`  ${r.name}: ${r.avgConfidence.toFixed(2)}`);
      }
    }
    console.log(`Normal layout: ${highConf.length}/${normal.length} (${(pct * 100).toFixed(0)}%) at confidence >= 0.9`);
    expect(pct).toBeGreaterThanOrEqual(0.9);
  });

  it('adventure layout: all cards parseable (confidence > 0)', () => {
    const adventure = results.filter((r) => r.layout === 'adventure');
    expect(adventure.length).toBeGreaterThan(0);
    const unparseable = adventure.filter((r) => r.avgConfidence === 0);
    expect(unparseable).toHaveLength(0);
  });

  it('transform layout: all cards parseable (confidence > 0)', () => {
    const transform = results.filter((r) => r.layout === 'transform');
    expect(transform.length).toBeGreaterThan(0);
    const unparseable = transform.filter((r) => r.avgConfidence === 0);
    expect(unparseable).toHaveLength(0);
  });

  it('modal_dfc layout: all cards parseable (confidence > 0)', () => {
    const modalDfc = results.filter((r) => r.layout === 'modal_dfc');
    expect(modalDfc.length).toBeGreaterThan(0);
    const unparseable = modalDfc.filter((r) => r.avgConfidence === 0);
    expect(unparseable).toHaveLength(0);
  });

  it('split layout: all cards parseable (confidence > 0)', () => {
    const split = results.filter((r) => r.layout === 'split');
    expect(split.length).toBeGreaterThan(0);
    const unparseable = split.filter((r) => r.avgConfidence === 0);
    expect(unparseable).toHaveLength(0);
  });
});
