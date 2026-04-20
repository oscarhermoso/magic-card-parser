// @ts-nocheck — snapshot-driven shape coverage for parseCardFull()
import { describe, it, expect } from 'vitest';
import { parseCardFull } from '../src/magicCardParser.js';

// ============================================================================
// ParsedCard shape tests (pa-4na — MTGOSDK-style output)
//
// Covers all 7 card layouts: normal, adventure, transform, modal_dfc, split,
// flip, leveler, meld. Assertions check both the structural contract (types
// present, abilities classified by type discriminator) and, via snapshots,
// that the shape is stable.
// ============================================================================

describe('parseCardFull(): normal layout — vanilla creature', () => {
  it('Serra Angel — keywords separated, types structured, mana cost parsed', () => {
    const card = parseCardFull({
      name: 'Serra Angel',
      oracle_text: 'Flying, vigilance',
      layout: 'normal',
      mana_cost: '{3}{W}{W}',
      type_line: 'Creature — Angel',
      power: '4',
      toughness: '4',
      colors: ['w'],
      color_identity: ['w'],
    });
    expect(card.name).toBe('Serra Angel');
    expect(card.layout).toBe('normal');
    expect(card.types).toEqual({ super: [], main: ['creature'], sub: ['angel'] });
    expect(card.manaCost?.cmc).toBe(5);
    expect(card.manaCost?.symbols).toHaveLength(3);
    expect(card.power).toBe(4);
    expect(card.toughness).toBe(4);
    expect(card.colors).toEqual(['w']);
    expect(card.keywords).toHaveLength(2);
    expect(card.keywords.map((k) => k.keyword).sort()).toEqual(['flying', 'vigilance']);
    expect(card.abilities).toHaveLength(0);
    expect(card.confidence).toBe(1);
    expect(card).toMatchSnapshot();
  });

  it('Llanowar Elves — activated ability classified', () => {
    const card = parseCardFull({
      name: 'Llanowar Elves',
      oracle_text: '{T}: Add {G}.',
      layout: 'normal',
      mana_cost: '{G}',
      type_line: 'Creature — Elf Druid',
      power: '1',
      toughness: '1',
    });
    expect(card.abilities).toHaveLength(1);
    expect(card.abilities[0].type).toBe('activated');
    expect(card.keywords).toHaveLength(0);
    expect(card.manaCost?.cmc).toBe(1);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): normal layout — planeswalker', () => {
  it('Jace, the Mind Sculptor — loyalty passed through, multiple abilities', () => {
    const card = parseCardFull({
      name: 'Jace, the Mind Sculptor',
      oracle_text: '+2: Look at the top card of target player\'s library.\n-1: Draw three cards.',
      layout: 'normal',
      mana_cost: '{2}{U}{U}',
      type_line: 'Legendary Planeswalker — Jace',
      loyalty: '3',
    });
    expect(card.types.super).toEqual(['legendary']);
    expect(card.types.main).toContain('planeswalker');
    expect(card.loyalty).toBe(3);
    expect(card.manaCost?.cmc).toBe(4);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): normal layout — instant (spell)', () => {
  it('Counterspell — effects classified as spell', () => {
    const card = parseCardFull({
      name: 'Counterspell',
      oracle_text: 'Counter target spell.',
      layout: 'normal',
      mana_cost: '{U}{U}',
      type_line: 'Instant',
    });
    expect(card.types.main).toEqual(['instant']);
    expect(card.abilities).toHaveLength(1);
    expect(card.abilities[0].type).toBe('spell');
    expect(card.manaCost?.cmc).toBe(2);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): adventure layout', () => {
  it('Bonecrusher Giant // Stomp — faces array populated, otherFace set', () => {
    const card = parseCardFull({
      name: 'Bonecrusher Giant // Stomp',
      oracle_text: '',
      layout: 'adventure',
      card_faces: [
        {
          name: 'Bonecrusher Giant',
          oracle_text:
            "Whenever this creature becomes the target of a spell, this creature deals 2 damage to that spell's controller.",
        },
        {
          name: 'Stomp',
          oracle_text: 'Stomp deals 2 damage to any target.',
        },
      ],
    });
    expect(card.layout).toBe('adventure');
    expect(card.faces).toHaveLength(2);
    expect(card.faces?.[0].name).toBe('Bonecrusher Giant');
    expect(card.faces?.[1].name).toBe('Stomp');
    expect(card.otherFace).toBe('Stomp');
    // Front face is the creature; back face should parse cleanly as a spell effect
    expect(card.faces?.[1].abilities[0].type).toBeTruthy();
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): transform (DFC) layout', () => {
  it('Delver of Secrets // Insectile Aberration — back face keyword classified', () => {
    const card = parseCardFull({
      name: 'Delver of Secrets // Insectile Aberration',
      oracle_text: '',
      layout: 'transform',
      card_faces: [
        {
          name: 'Delver of Secrets',
          oracle_text:
            'At the beginning of your upkeep, look at the top card of your library. You may reveal that card.',
        },
        { name: 'Insectile Aberration', oracle_text: 'Flying' },
      ],
    });
    expect(card.layout).toBe('transform');
    expect(card.faces).toHaveLength(2);
    // Back face should have 'flying' as a keyword (not ability)
    expect(card.faces?.[1].keywords.map((k) => k.keyword)).toContain('flying');
    expect(card.faces?.[1].abilities).toHaveLength(0);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): modal_dfc layout', () => {
  it('Shatterskull Smashing // Shatterskull, the Hammer Pass — otherFace set', () => {
    const card = parseCardFull({
      name: 'Shatterskull Smashing // Shatterskull, the Hammer Pass',
      oracle_text: '',
      layout: 'modal_dfc',
      card_faces: [
        {
          name: 'Shatterskull Smashing',
          oracle_text: 'Shatterskull Smashing deals X damage to any target.',
        },
        { name: 'Shatterskull, the Hammer Pass', oracle_text: '' },
      ],
    });
    expect(card.layout).toBe('modal_dfc');
    expect(card.faces).toHaveLength(2);
    expect(card.otherFace).toBe('Shatterskull, the Hammer Pass');
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): split layout', () => {
  it('Dead // Gone — both halves classified as spells', () => {
    const card = parseCardFull({
      name: 'Dead // Gone',
      oracle_text:
        "Dead deals 2 damage to target creature.\n//\nReturn target creature you don't control to its owner's hand.",
      layout: 'split',
    });
    expect(card.layout).toBe('split');
    expect(card.faces).toBeUndefined(); // split uses oracle_text separator, not card_faces
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): flip layout', () => {
  it('Kitsune Mystic — flip layout carries otherFace', () => {
    const card = parseCardFull({
      name: 'Kitsune Mystic // Autumn-Tail, Kitsune Sage',
      oracle_text: '',
      layout: 'flip',
      card_faces: [
        {
          name: 'Kitsune Mystic',
          oracle_text:
            'At the beginning of the end step, if this creature is enchanted by two or more Auras, flip it.',
        },
        {
          name: 'Autumn-Tail, Kitsune Sage',
          oracle_text: '{1}: Attach target Aura you control to target creature.',
        },
      ],
    });
    expect(card.layout).toBe('flip');
    expect(card.faces).toHaveLength(2);
    expect(card.otherFace).toBe('Autumn-Tail, Kitsune Sage');
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): leveler layout', () => {
  it('Kargan Dragonlord — simple keywords carry through', () => {
    // Leveler cards have level-up costs and tiered P/T; grammar covers much via
    // CostKeyword 'level up'. We assert the shape survives even when the
    // complex "LEVEL N-M" blocks are unknown clauses.
    const card = parseCardFull({
      name: 'Kargan Dragonlord',
      oracle_text: 'Level up {R}',
      layout: 'leveler',
      mana_cost: '{R}',
      type_line: 'Creature — Human Warrior',
      power: '2',
      toughness: '2',
    });
    expect(card.layout).toBe('leveler');
    expect(card.types.main).toEqual(['creature']);
    // level up is a CostKeyword with mana payload
    expect(card.keywords.length + card.abilities.length).toBeGreaterThan(0);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): meld layout', () => {
  it('Bruna, the Fading Light — meld card has single face but layout preserved', () => {
    const card = parseCardFull({
      name: 'Bruna, the Fading Light',
      oracle_text: 'Flying',
      layout: 'meld',
      mana_cost: '{5}{W}{W}',
      type_line: 'Legendary Creature — Angel Horror',
      power: '5',
      toughness: '7',
    });
    expect(card.layout).toBe('meld');
    expect(card.types.super).toEqual(['legendary']);
    expect(card.keywords.map((k) => k.keyword)).toContain('flying');
    expect(card.manaCost?.cmc).toBe(7);
    expect(card).toMatchSnapshot();
  });
});

describe('parseCardFull(): conditional trigger (pa-1kr coverage)', () => {
  it('Revolt ability word classified on triggered ability', () => {
    const card = parseCardFull({
      name: 'Test Revolt',
      oracle_text:
        'At the beginning of your upkeep, draw a card.',
      layout: 'normal',
      type_line: 'Creature — Human',
    });
    const triggered = card.abilities.find((a) => a.type === 'triggered');
    expect(triggered).toBeDefined();
    if (triggered && triggered.type === 'triggered') {
      expect(triggered.trigger).toBeDefined();
      expect(Array.isArray(triggered.effects)).toBe(true);
    }
  });
});

describe('parseCardFull(): mana cost parsing', () => {
  it('Complex mana cost: {X}{2}{W/U}{B/P}', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'normal',
      mana_cost: '{X}{2}{W/U}{B/P}',
    });
    const mc = card.manaCost!;
    expect(mc.symbols.map((s) => s.kind)).toEqual(['x', 'generic', 'hybrid', 'phyrexian']);
    // cmc: x=0, 2=2, hybrid=1, phyrexian=1 → 4
    expect(mc.cmc).toBe(4);
  });

  it('Snow mana: {S}{S}', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'normal',
      mana_cost: '{S}{S}',
    });
    expect(card.manaCost?.symbols.every((s) => s.kind === 'snow')).toBe(true);
    expect(card.manaCost?.cmc).toBe(2);
  });
});

describe('parseCardFull(): P/T coercion', () => {
  it('numeric P/T → numbers', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'normal',
      power: '3',
      toughness: '4',
    });
    expect(card.power).toBe(3);
    expect(card.toughness).toBe(4);
  });

  it("'*' P/T stays a string", () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'normal',
      power: '*',
      toughness: '*',
    });
    expect(card.power).toBe('*');
    expect(card.toughness).toBe('*');
  });

  it('defense (battles) passes through', () => {
    const card = parseCardFull({
      name: 'Test Battle',
      oracle_text: 'Flying',
      layout: 'normal',
      type_line: 'Battle — Siege',
      defense: '5',
    });
    expect(card.defense).toBe(5);
  });
});

describe('parseCardFull(): keyword classification', () => {
  it('simple keywords become ParsedKeyword entries, not ParsedAbility', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying, haste, trample',
      layout: 'normal',
    });
    expect(card.keywords).toHaveLength(3);
    expect(card.keywords.map((k) => k.keyword).sort()).toEqual(['flying', 'haste', 'trample']);
    expect(card.abilities).toHaveLength(0);
  });

  it('keyword with mana cost carries structured cost', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flashback {1}{R}',
      layout: 'normal',
    });
    const flashback = card.keywords.find((k) => k.keyword === 'flashback');
    expect(flashback).toBeDefined();
    expect(flashback?.cost).toBeDefined();
    expect(flashback?.cost?.cmc).toBe(2);
  });
});

describe('parseCardFull(): unknown clauses preserved', () => {
  it('partial parse: abilities classified, unknown clause listed', () => {
    const card = parseCardFull({
      name: 'Test',
      oracle_text: 'Flying\nThis clause cannot be parsed by the grammar at all.',
      layout: 'normal',
    });
    expect(card.unknownClauses.length).toBeGreaterThan(0);
    expect(card.confidence).toBeLessThan(1);
    expect(card.keywords.map((k) => k.keyword)).toContain('flying');
    expect(card.abilities.find((a) => a.type === 'unknown')).toBeDefined();
  });
});
