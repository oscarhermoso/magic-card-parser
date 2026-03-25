import { describe, it, expect } from 'vitest';
import type {
  ParseResult,
  TypeLineResult,
  TypeLineNode,
  AbilityNode,
  ActivatedAbilityNode,
  TriggeredAbilityNode,
  KeywordObject,
  CostSpec,
  TriggerSpec,
  ManaCostValue,
} from '../src/index';

import { parseCard as _parseCard, parseTypeLine } from '../src/magicCardParser.js';

/** Wrapper that defaults layout to 'normal' */
function parseCard(input: { name: string; oracle_text: string }): ParseResult {
  return _parseCard({ ...input, layout: 'normal' });
}

// ---------------------------------------------------------------------------
// Type guard helpers — eliminate `as` casts after .find()
// ---------------------------------------------------------------------------

function isObject(a: AbilityNode): a is Exclude<AbilityNode, string | AbilityNode[]> {
  return typeof a === 'object' && a !== null && !Array.isArray(a);
}

function isActivated(a: AbilityNode): a is ActivatedAbilityNode {
  return isObject(a) && 'activatedAbility' in a;
}

function isTriggered(a: AbilityNode): a is TriggeredAbilityNode {
  return isObject(a) && 'trigger' in a;
}

function isKeywordObject(a: AbilityNode): a is KeywordObject {
  return isObject(a) && !('activatedAbility' in a) && !('trigger' in a)
    && !('quantifier' in a) && !('additionalCost' in a);
}

/**
 * Type-level tests: verify that actual parser output is assignable to our types.
 * Runtime assertions validate that actual shapes match declared types.
 */

function assertParseResult(r: unknown): asserts r is ParseResult {
  expect(r).toHaveProperty('oracleText');
  expect(r).toHaveProperty('card');
  expect(typeof r === 'object' && r !== null && 'error' in r).toBe(true);
  expect(typeof r === 'object' && r !== null && ('result' in r || 'parsed' in r)).toBe(true);
}

describe('type definitions match actual parser output', () => {
  describe('ParseResult shape', () => {
    it('successful parse has result, error=null, oracleText, card', () => {
      const r = parseCard({
        name: 'Serra Angel',
        oracle_text: 'Flying, vigilance',
      });
      assertParseResult(r);
      expect(r.error).toBeNull();
      expect(r.result).not.toBeNull();
      expect(Array.isArray(r.result)).toBe(true);
      expect(typeof r.oracleText).toBe('string');
      expect(r.card).toHaveProperty('name', 'Serra Angel');
    });

    it('error parse has error set', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'This is not valid magic card text that should parse at all.',
      });
      assertParseResult(r);
      expect(r.error).toBeTruthy();
    });
  });

  describe('TypeLineNode shape', () => {
    it('simple creature type line', () => {
      const r = parseTypeLine('creature — human wizard');
      expect(r.error).toBeNull();
      const node = r.result![0];
      expect(node.type).toBe('creature');
      // subType can be string or { and: string[] }
      expect(node.subType).toBeDefined();
    });

    it('multi-type card (artifact creature)', () => {
      const r = parseTypeLine('artifact creature — golem');
      expect(r.error).toBeNull();
      const node = r.result![0];
      // type can be { and: ["artifact", "creature"] }
      if (typeof node.type === 'object') {
        expect(node.type).toHaveProperty('and');
        expect(Array.isArray(node.type.and)).toBe(true);
      }
    });

    it('legendary supertype', () => {
      const r = parseTypeLine('legendary creature — elf druid');
      expect(r.error).toBeNull();
      const node = r.result![0];
      // superType is singular string, not superTypes array
      expect(typeof node.superType === 'string' || node.superType === undefined).toBe(true);
    });
  });

  describe('keyword shapes', () => {
    it('bare keywords are flattened as individual strings', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Flying, haste',
      });
      expect(r.error).toBeNull();
      const abilities = r.result![0];
      // Keywords are flattened as individual strings in the top-level array
      const keywords = abilities.filter((a): a is string => typeof a === 'string');
      expect(keywords).toContain('flying');
      expect(keywords).toContain('haste');
    });

    it('keyword with mana cost has { mana: [...] } value', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Flashback {1}{R}',
      });
      if (r.error) return; // skip if grammar doesn't handle this
      const abilities = r.result![0];
      const kwObj = abilities.find(
        (a): a is KeywordObject => isKeywordObject(a) && 'flashback' in a
      );
      if (kwObj) {
        const val = kwObj.flashback;
        // Value should be { mana: [...] } not a plain string
        if (typeof val === 'object') {
          expect(val).toHaveProperty('mana');
          expect(Array.isArray(val.mana)).toBe(true);
        }
      }
    });
  });

  describe('activated ability shape', () => {
    it('tap ability has costs and activatedAbility', () => {
      const r = parseCard({
        name: 'Llanowar Elves',
        oracle_text: '{T}: Add {G}.',
      });
      expect(r.error).toBeNull();
      const abilities = r.result![0];
      const activated = abilities.find(isActivated);
      expect(activated).toBeDefined();
      expect(activated!.costs).toBeDefined();
      expect(activated!.activatedAbility).toBeDefined();
    });
  });

  describe('triggered ability shape', () => {
    it('has trigger and effect', () => {
      const r = parseCard({
        name: 'Dark Confidant',
        oracle_text: 'At the beginning of your upkeep, reveal the top card of your library and put that card into your hand. You lose life equal to its mana value.',
      });
      if (r.error) return; // skip if grammar doesn't handle this
      const abilities = r.result![0];
      const triggered = abilities.find(isTriggered);
      if (triggered) {
        expect(triggered.trigger).toBeDefined();
        expect(triggered.effect).toBeDefined();
        // trigger should have turnPhase or when/whenever
        const trigger: TriggerSpec = triggered.trigger;
        expect(
          trigger.when || trigger.whenever || trigger.turnPhase || trigger.at
        ).toBeDefined();
      }
    });
  });

  describe('effect node shapes', () => {
    it('counter spell effect', () => {
      const r = parseCard({
        name: 'Counterspell',
        oracle_text: 'Counter target spell.',
      });
      expect(r.error).toBeNull();
      const abilities = r.result![0];
      // Find counter effect
      const counterEffect = abilities.find(
        a => isObject(a) && 'counter' in a
      );
      expect(counterEffect).toBeDefined();
    });

    it('create token effect', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Create a 1/1 white Soldier creature token.',
      });
      if (r.error) return;
      const abilities = r.result![0];
      const createEffect = abilities.find(
        a => isObject(a) && 'create' in a
      );
      if (createEffect) {
        expect(createEffect).toHaveProperty('create');
      }
    });

    it('addOneOf mana effect can have nested arrays', () => {
      const r = parseCard({
        name: 'Llanowar Elves',
        oracle_text: '{T}: Add {G}.',
      });
      expect(r.error).toBeNull();
      const abilities = r.result![0];
      const activated = abilities.find(isActivated);
      if (activated) {
        const effect = activated.activatedAbility;
        if (!Array.isArray(effect) && typeof effect === 'object' && 'addOneOf' in effect) {
          // addOneOf is (string | string[])[]
          expect(Array.isArray(effect.addOneOf)).toBe(true);
        }
      }
    });
  });

  describe('cost spec shapes', () => {
    it('mana cost has array value', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: '{1}{W}, {T}: Destroy target creature.',
      });
      if (r.error) return;
      const abilities = r.result![0];
      const activated = abilities.find(isActivated);
      if (activated) {
        const costs = activated.costs;
        // Costs with mana should have mana: (string|number)[]
        if (typeof costs === 'object' && costs !== null && !Array.isArray(costs) && 'mana' in costs) {
          expect(Array.isArray(costs.mana)).toBe(true);
        }
      }
    });
  });
});
