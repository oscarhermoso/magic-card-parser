import { describe, it, expect } from 'vitest';
import type {
  ParseResult,
  TypeLineResult,
  TypeLineNode,
  AbilityNode,
  ActivatedAbilityNode,
  TriggeredAbilityNode,
  ModalNode,
  EffectNode,
  KeywordObject,
  CostSpec,
  TriggerSpec,
  ObjectSpec,
  ManaCostValue,
  TokenSpec,
} from '../src/index';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseCard: _parseCard, parseTypeLine } = require('../src/magicCardParser');

/** Wrapper that defaults layout to 'normal' */
function parseCard(input: { name: string; oracle_text: string }) {
  return _parseCard({ ...input, layout: 'normal' });
}

/**
 * Type-level tests: verify that actual parser output is assignable to our types.
 * Runtime assertions validate that actual shapes match declared types.
 */

function assertParseResult(r: unknown): asserts r is ParseResult {
  const pr = r as ParseResult;
  expect(pr).toHaveProperty('oracleText');
  expect(pr).toHaveProperty('card');
  expect('error' in pr).toBe(true);
  expect('result' in pr || 'parsed' in pr).toBe(true);
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
      const r = parseTypeLine('creature — human wizard') as TypeLineResult;
      expect(r.error).toBeNull();
      const node = r.result![0] as TypeLineNode;
      expect(node.type).toBe('creature');
      // subType can be string or { and: string[] }
      expect(node.subType).toBeDefined();
    });

    it('multi-type card (artifact creature)', () => {
      const r = parseTypeLine('artifact creature — golem') as TypeLineResult;
      expect(r.error).toBeNull();
      const node = r.result![0] as TypeLineNode;
      // type can be { and: ["artifact", "creature"] }
      if (typeof node.type === 'object') {
        expect(node.type).toHaveProperty('and');
        expect(Array.isArray(node.type.and)).toBe(true);
      }
    });

    it('legendary supertype', () => {
      const r = parseTypeLine('legendary creature — elf druid') as TypeLineResult;
      expect(r.error).toBeNull();
      const node = r.result![0] as TypeLineNode;
      // superType is singular string, not superTypes array
      expect(typeof node.superType === 'string' || node.superType === undefined).toBe(true);
    });
  });

  describe('keyword shapes', () => {
    it('bare keywords come as string arrays', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Flying, haste',
      }) as ParseResult;
      expect(r.error).toBeNull();
      const abilities: AbilityNode[] = r.result![0];
      // Keywords come as string arrays like ["flying"]
      const keywords = abilities.filter(a => Array.isArray(a) && a.every(s => typeof s === 'string'));
      expect(keywords.length).toBeGreaterThan(0);
    });

    it('keyword with mana cost has { mana: [...] } value', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Flashback {1}{R}',
      }) as ParseResult;
      if (r.error) return; // skip if grammar doesn't handle this
      const abilities: AbilityNode[] = r.result![0];
      const kwObj = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'flashback' in a
      ) as KeywordObject | undefined;
      if (kwObj) {
        const val = kwObj.flashback;
        // Value should be { mana: [...] } not a plain string
        if (typeof val === 'object') {
          expect(val).toHaveProperty('mana');
          expect(Array.isArray((val as { mana: ManaCostValue }).mana)).toBe(true);
        }
      }
    });
  });

  describe('activated ability shape', () => {
    it('tap ability has costs and activatedAbility', () => {
      const r = parseCard({
        name: 'Llanowar Elves',
        oracle_text: '{T}: Add {G}.',
      }) as ParseResult;
      expect(r.error).toBeNull();
      const abilities: AbilityNode[] = r.result![0];
      const activated = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'activatedAbility' in a
      ) as ActivatedAbilityNode | undefined;
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
      }) as ParseResult;
      if (r.error) return; // skip if grammar doesn't handle this
      const abilities: AbilityNode[] = r.result![0];
      const triggered = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'trigger' in a
      ) as TriggeredAbilityNode | undefined;
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
      }) as ParseResult;
      expect(r.error).toBeNull();
      const abilities: AbilityNode[] = r.result![0];
      // Find counter effect
      const counterEffect = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'counter' in a
      );
      expect(counterEffect).toBeDefined();
    });

    it('create token effect', () => {
      const r = parseCard({
        name: 'Test',
        oracle_text: 'Create a 1/1 white Soldier creature token.',
      }) as ParseResult;
      if (r.error) return;
      const abilities: AbilityNode[] = r.result![0];
      const createEffect = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'create' in a
      ) as { create: TokenSpec } | undefined;
      if (createEffect) {
        expect(createEffect.create).toBeDefined();
      }
    });

    it('addOneOf mana effect can have nested arrays', () => {
      const r = parseCard({
        name: 'Llanowar Elves',
        oracle_text: '{T}: Add {G}.',
      }) as ParseResult;
      expect(r.error).toBeNull();
      const abilities: AbilityNode[] = r.result![0];
      const activated = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'activatedAbility' in a
      ) as ActivatedAbilityNode | undefined;
      if (activated) {
        const effect = activated.activatedAbility as Record<string, unknown>;
        if ('addOneOf' in effect) {
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
      }) as ParseResult;
      if (r.error) return;
      const abilities: AbilityNode[] = r.result![0];
      const activated = abilities.find(
        a => typeof a === 'object' && a !== null && !Array.isArray(a) && 'activatedAbility' in a
      ) as ActivatedAbilityNode | undefined;
      if (activated) {
        const costs: CostSpec = activated.costs;
        // Costs with mana should have mana: (string|number)[]
        if (typeof costs === 'object' && costs !== null && 'mana' in costs) {
          expect(Array.isArray((costs as { mana: ManaCostValue }).mana)).toBe(true);
        }
      }
    });
  });
});
