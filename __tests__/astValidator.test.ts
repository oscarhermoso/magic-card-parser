/**
 * AST Shape Validator
 *
 * Parses every test card and checks that all AST nodes use keys
 * declared in index.d.ts. Catches drift between grammar and types.
 *
 * Strategy: rather than validating the full tree (which would require
 * reimplementing TypeScript's type checker), we:
 * 1. Collect all unique key-sets from objects at "effect positions"
 * 2. Verify each matches a declared EffectNode/AbilityNode variant
 * 3. Check specific structural invariants (no string[] keywords, etc.)
 */
import { describe, it, expect } from 'vitest';
import { parseCard } from '../src/magicCardParser.js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ---------------------------------------------------------------------------
// Known discriminant keys — the primary key that identifies each variant
// ---------------------------------------------------------------------------

/** Keys that can appear as top-level keys on EffectNode variants */
const KNOWN_EFFECT_KEYS = new Set([
  // Movement/zone changes
  'draw',
  'destroy',
  'exile',
  'sacrifice',
  'discard',
  'counter',
  'returns',
  'search',
  'put',
  'cast',
  'shuffle',
  'reveal',
  'lookAt',
  'separate',
  'putBack',
  'mill',
  // Creation
  'create',
  // Life
  'loseLife',
  'gainLife',
  'lifeGain',
  // Library manipulation
  'scry',
  'surveil',
  // Permanents
  'tap',
  'untap',
  'attach',
  'enchant',
  // Mana
  'add',
  'addOneOf',
  'addCombinationOf',
  // Counters
  'counterKind', // always with 'amount' and 'putOn'
  // Combat/damage
  'deal',
  // Control
  'gainControlOf',
  // Stats
  'powerToughnessMod',
  // Costs
  'costIncrease',
  'costDecrease',
  // Abilities
  'haveAbility',
  'gains',
  'loses',
  'cant',
  // Compound
  'and',
  'or',
  'xor',
  'may',
  // Subject-verb
  'what',
  'actor',
  'does', // standalone does (with unless/forEach)
  // Conditions/duration
  'condition',
  'asLongAs',
  'duration',
  // Miscellaneous
  'emblem',
  'prevent',
  'ratherThan',
  'addCombinationOf',
  'protectionFrom',
  'each',
  'is',
  'skip',
  'choose',
  'would',
  'except',
  'while',
  'playRevealed',
  'whose',
  'activatedAbilities',
  'characteristic',
  'setTo',
  'flashbackCost',
]);

/** Keys that identify top-level AbilityNode types (not EffectNode) */
const ABILITY_NODE_KEYS = new Set([
  'activatedAbility', // ActivatedAbilityNode
  'trigger', // TriggeredAbilityNode
  'quantifier', // ModalNode
  'additionalCost', // AdditionalCostNode
]);

/**
 * KeywordObject keys — these appear as `{ keyword: cost }` at top level.
 * They're valid AbilityNode variants (KeywordObject type).
 */
const KEYWORD_OBJECT_KEYS = new Set([
  // Cost keywords
  'equip',
  'escape',
  'spectacle',
  'eternalize',
  'embalm',
  'escalate',
  'emerge',
  'surge',
  'awaken',
  'dash',
  'outlast',
  'mutate',
  'bestow',
  'scavenge',
  'overload',
  'buyback',
  'echo',
  'flashback',
  'madness',
  'morph',
  'entwine',
  'ninjutsu',
  'transmute',
  'replicate',
  'recover',
  'fortify',
  'evoke',
  'unearth',
  'miracle',
  'megamorph',
  'prowl',
  'transfigure',
  'multikicker',
  'kicker',
  // Number keywords
  'afterlife',
  'afflict',
  'fabricate',
  'crew',
  'renown',
  'tribute',
  'rampage',
  'fading',
  'amplify',
  'modular',
  'bushido',
  'dredge',
  'graft',
  'ripple',
  'vanishing',
  'absorb',
  'poisonous',
  'devour',
  'annihilator',
  'frenzy',
  'soulshift',
  // Cycling with type
  'cycling',
  'cyclingType',
]);

/** All keys that can validly appear on AbilityNode/EffectNode objects */
const ALL_KNOWN_KEYS = new Set([
  ...KNOWN_EFFECT_KEYS,
  ...ABILITY_NODE_KEYS,
  ...KEYWORD_OBJECT_KEYS,
  // ActivatedAbilityNode extra keys
  'costs',
  'instructions',
  'abilityWord',
  // TriggeredAbilityNode extra keys
  'effect',
  // ModalNode extra keys
  'options',
  // EffectNode optional/secondary keys
  'faceDown',
  'until',
  'random',
  'to',
  'tapped',
  'criteria',
  'amount',
  'putOn',
  'withoutPaying',
  'into',
  'control',
  'unless',
  'forEach',
  'from',
  'anyOrder',
  'action',
  'instead',
  // Verb phrase keys (appears as value of 'does')
  // Keys from deeper structures that might bubble up
  'X',
  'as',
  'entersWith',
  'enter',
  // New effect secondary keys
  'is',
  'except',
  'while',
  'activatedAbilities',
  'setTo',
]);

// ---------------------------------------------------------------------------
// Extract test cards
// ---------------------------------------------------------------------------

interface Card {
  name: string;
  oracle_text: string;
}

function extractCards(): Card[] {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const content = readFileSync(join(__dirname, 'simpleIsBest.test.ts'), 'utf8');
  const cards: Card[] = [];
  for (const line of content.split('\n')) {
    const m = line.match(/name: '([^']+)'.*oracle_text: '((?:[^'\\]|\\.)*)'/);
    if (!m || line.includes('parseError: true')) continue;
    cards.push({
      name: m[1],
      oracle_text: m[2].replace(/\\n/g, '\n').replace(/\\'/g, "'"),
    });
  }
  return cards;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('AST shape validation against index.d.ts', () => {
  const cards = extractCards();

  it('extracts test cards', () => {
    expect(cards.length).toBeGreaterThan(100);
  });

  it('every top-level ability node has at least one known discriminant key', () => {
    const unknown: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      for (const ability of result.result[0]) {
        if (typeof ability === 'string') continue;
        if (Array.isArray(ability)) continue; // EffectNode[] is valid
        if (typeof ability !== 'object' || ability === null) continue;

        const keys = Object.keys(ability);
        const hasKnownKey = keys.some(
          (k) =>
            KNOWN_EFFECT_KEYS.has(k) ||
            ABILITY_NODE_KEYS.has(k) ||
            KEYWORD_OBJECT_KEYS.has(k),
        );

        if (!hasKnownKey) {
          unknown.push(`${card.name}: {${keys.join(', ')}}`);
        }
      }
    }

    if (unknown.length > 0) {
      console.log(
        `\nTop-level nodes with no known discriminant key:\n  ${unknown.join('\n  ')}`,
      );
    }
    expect(unknown).toEqual([]);
  });

  it('no top-level keys on ability nodes are completely unknown', () => {
    const unknownKeys = new Map<string, string[]>();

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      for (const ability of result.result[0]) {
        if (typeof ability === 'string') continue;
        if (Array.isArray(ability)) continue;
        if (typeof ability !== 'object' || ability === null) continue;

        for (const key of Object.keys(ability)) {
          if (!ALL_KNOWN_KEYS.has(key)) {
            if (!unknownKeys.has(key)) unknownKeys.set(key, []);
            unknownKeys.get(key)!.push(card.name);
          }
        }
      }
    }

    if (unknownKeys.size > 0) {
      const summary = [...unknownKeys.entries()]
        .map(
          ([key, cards]) =>
            `  "${key}" — found in: ${cards.slice(0, 3).join(', ')}${cards.length > 3 ? ` (+${cards.length - 3} more)` : ''}`,
        )
        .join('\n');
      console.log(`\nUnknown top-level keys on ability nodes:\n${summary}`);
    }
    expect(unknownKeys.size).toBe(0);
  });

  it('no AbilityNode is a bare string[] (keywords should be flattened)', () => {
    const found: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      for (const ability of result.result[0]) {
        if (
          Array.isArray(ability) &&
          ability.every((a) => typeof a === 'string')
        ) {
          found.push(
            `${card.name}: [${String(ability)}]`,
          );
        }
      }
    }

    if (found.length > 0) {
      console.log(
        `\nString[] at top level (should be flattened):\n  ${found.join('\n  ')}`,
      );
    }
    expect(found).toEqual([]);
  });

  it('counterKind is string or {powerMod, toughnessMod}', () => {
    const bad: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      JSON.stringify(result.result[0], (key, value) => {
        if (key === 'counterKind') {
          const ok =
            typeof value === 'string' ||
            (typeof value === 'object' &&
              value !== null &&
              'powerMod' in value &&
              'toughnessMod' in value);
          if (!ok)
            bad.push(`${card.name}: counterKind = ${JSON.stringify(value)}`);
        }
        return value;
      });
    }

    expect(bad).toEqual([]);
  });

  it('type fields that are objects use {and: string[]} or {or: string[]}', () => {
    const bad: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      JSON.stringify(result.result[0], function (key, value) {
        if (
          key === 'type' &&
          value !== null &&
          typeof value === 'object' &&
          !Array.isArray(value)
        ) {
          const keys = Object.keys(value);
          // {and: [...]} or {or: [...]} are valid TypeFilter shapes
          if (keys.length === 1 && (keys[0] === 'and' || keys[0] === 'or')) {
            if (!Array.isArray(value[keys[0]])) {
              bad.push(`${card.name}: type.${keys[0]} is not an array`);
            }
          }
          // Other object shapes for 'type' are ObjectSpec-level (e.g. {type: {and: [...]}})
          // which is fine — we only check TypeFilter-shaped values
        }
        return value;
      });
    }

    expect(bad).toEqual([]);
  });

  it('TriggeredAbilityNode has no ifClause field', () => {
    const found: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      for (const ability of result.result[0]) {
        if (
          typeof ability === 'object' &&
          ability !== null &&
          !Array.isArray(ability) &&
          'trigger' in ability &&
          'ifClause' in ability
        ) {
          found.push(card.name);
        }
      }
    }

    expect(found).toEqual([]);
  });

  it('ActivatedAbilityNode has no unexpected keys', () => {
    const validKeys = new Set([
      'costs',
      'activatedAbility',
      'instructions',
      'abilityWord',
    ]);
    const found: string[] = [];

    for (const card of cards) {
      const result = parseCard({ ...card, layout: 'normal' });
      if (result.error || !result.result) continue;

      for (const ability of result.result[0]) {
        if (
          typeof ability === 'object' &&
          ability !== null &&
          !Array.isArray(ability) &&
          'activatedAbility' in ability
        ) {
          for (const key of Object.keys(ability)) {
            if (!validKeys.has(key)) {
              found.push(
                `${card.name}: unexpected key "${key}" on ActivatedAbilityNode`,
              );
            }
          }
        }
      }
    }

    expect(found).toEqual([]);
  });
});
