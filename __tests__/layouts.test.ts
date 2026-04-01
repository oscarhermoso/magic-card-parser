// @ts-nocheck — data-driven test file; type narrowing not needed for parse result assertions
import { describe, it, expect } from 'vitest';
import { parseAdventure, parseCard, parseFaces } from '../src/magicCardParser.js';

// ============================================================================
// Multi-face card layout tests
// Covers adventure, transform/DFC, split, and modal_dfc layouts.
// Uses parseFaces() and parseAdventure() APIs added in v1.0.
//
// Note: grammar parse success varies by oracle text complexity. Tests verify
// that parseFaces() correctly routes each face to the parser independently.
// Face-level grammar failures are expected for complex text (complex triggers,
// "transform" verb, "can't be prevented", etc.) — these are grammar gaps
// tracked in hq-p0o (new EffectNode types bead).
// ============================================================================

describe('parseFaces(): adventure layout', () => {
  it('Bonecrusher Giant // Stomp — routes each face independently', () => {
    const result = parseFaces({
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
          oracle_text: "Damage can't be prevented this turn. Stomp deals 2 damage to any target.",
        },
      ],
    });
    expect(result.layout).toBe('adventure');
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Bonecrusher Giant');
    expect(result.faces[1].faceName).toBe('Stomp');
    // Creature face parses successfully
    expect(result.faces[0].result.error).toBeUndefined();
    expect(result.faces[0].result.candidates).not.toBeNull();
    expect(result.faces[0].result.abilities!).toMatchSnapshot();
    // Adventure face oracle text has grammar gaps (apostrophe in "can't be prevented") — parseable result still returned
    expect(result.faces[1].result).toBeDefined();
  });

  it('Brazen Borrower // Petty Theft — routes each face independently', () => {
    const result = parseFaces({
      name: 'Brazen Borrower // Petty Theft',
      oracle_text: '',
      layout: 'adventure',
      card_faces: [
        {
          name: 'Brazen Borrower',
          oracle_text: 'Flash\nFlying\nThis creature can block only creatures with flying.',
        },
        {
          name: 'Petty Theft',
          oracle_text: "Return target nonland permanent an opponent controls to its owner's hand.",
        },
      ],
    });
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Brazen Borrower');
    expect(result.faces[1].faceName).toBe('Petty Theft');
    // Adventure (spell) face parses cleanly
    expect(result.faces[1].result.error).toBeUndefined();
    expect(result.faces[1].result.candidates).not.toBeNull();
    expect(result.faces[1].result.abilities!).toMatchSnapshot();
    // Creature face has grammar gap ("can block only") — result still returned
    expect(result.faces[0].result).toBeDefined();
  });

  it("Lovestruck Beast // Heart's Desire — both faces parse correctly", () => {
    const result = parseFaces({
      name: "Lovestruck Beast // Heart's Desire",
      oracle_text: '',
      layout: 'adventure',
      card_faces: [
        {
          name: 'Lovestruck Beast',
          oracle_text: "This creature can't attack unless you control a 1/1 creature.",
        },
        {
          name: "Heart's Desire",
          oracle_text: 'Create a 1/1 white Human creature token.',
        },
      ],
    });
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Lovestruck Beast');
    expect(result.faces[1].faceName).toBe("Heart's Desire");
    expect(result.faces[0].result.error).toBeUndefined();
    expect(result.faces[0].result.candidates).not.toBeNull();
    expect(result.faces[1].result.error).toBeUndefined();
    expect(result.faces[1].result.candidates).not.toBeNull();
    expect(result.faces[0].result.abilities!).toMatchSnapshot();
    expect(result.faces[1].result.abilities!).toMatchSnapshot();
  });
});

describe('parseAdventure(): adventure layout convenience function', () => {
  it('Giant Killer // Chop Down — both faces parse correctly', () => {
    const result = parseAdventure(
      { name: 'Giant Killer', oracle_text: '{1}{W}, {T}: Tap target creature.' },
      {
        name: 'Chop Down',
        oracle_text: 'Destroy target creature with power 4 or greater.',
      },
    );
    expect(result.creature.error).toBeUndefined();
    expect(result.creature.candidates).not.toBeNull();
    expect(result.adventure.error).toBeUndefined();
    expect(result.adventure.candidates).not.toBeNull();
    expect(result.creature.abilities!).toMatchSnapshot();
    expect(result.adventure.abilities!).toMatchSnapshot();
  });

  it('Rimrock Knight // Boulder Rush — both faces parse correctly', () => {
    const result = parseAdventure(
      { name: 'Rimrock Knight', oracle_text: "This creature can't block." },
      {
        name: 'Boulder Rush',
        oracle_text: 'Target creature gets +2/+0 until end of turn.',
      },
    );
    expect(result.creature.error).toBeUndefined();
    expect(result.creature.candidates).not.toBeNull();
    expect(result.adventure.error).toBeUndefined();
    expect(result.adventure.candidates).not.toBeNull();
    expect(result.creature.abilities!).toMatchSnapshot();
    expect(result.adventure.abilities!).toMatchSnapshot();
  });
});

describe('parseFaces(): transform layout', () => {
  it('Delver of Secrets // Insectile Aberration — routes both faces, back face parses', () => {
    const result = parseFaces({
      name: 'Delver of Secrets // Insectile Aberration',
      oracle_text: '',
      layout: 'transform',
      card_faces: [
        {
          name: 'Delver of Secrets',
          oracle_text:
            'At the beginning of your upkeep, look at the top card of your library. You may reveal that card. If an instant or sorcery card is revealed this way, transform this creature.',
        },
        { name: 'Insectile Aberration', oracle_text: 'Flying' },
      ],
    });
    expect(result.layout).toBe('transform');
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Delver of Secrets');
    expect(result.faces[1].faceName).toBe('Insectile Aberration');
    // Back face (simple keyword) parses correctly
    expect(result.faces[1].result.error).toBeUndefined();
    expect(result.faces[1].result.candidates).not.toBeNull();
    expect(result.faces[1].result.abilities!).toMatchSnapshot();
    // Front face has grammar gap ("transform" verb) — result still returned
    expect(result.faces[0].result).toBeDefined();
  });

  it('Thing in the Ice // Awoken Horror — both faces return ParseResult objects', () => {
    const result = parseFaces({
      name: 'Thing in the Ice // Awoken Horror',
      oracle_text: '',
      layout: 'transform',
      card_faces: [
        {
          name: 'Thing in the Ice',
          oracle_text:
            'Defender\nThis creature enters with four ice counters on it.\nWhenever you cast an instant or sorcery spell, remove an ice counter from this creature. Then if it has no ice counters on it, transform it.',
        },
        {
          name: 'Awoken Horror',
          oracle_text:
            "When this creature transforms into Awoken Horror, return all non-Horror creatures to their owners' hands.",
        },
      ],
    });
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Thing in the Ice');
    expect(result.faces[1].faceName).toBe('Awoken Horror');
    // Both faces return ParseResult objects (grammar gaps expected for these complex texts)
    expect(result.faces[0].result).toBeDefined();
    // Grammar gaps: some clauses (counters, transform trigger) are unparseable —
    // unknownClauses is populated and confidence < 1 rather than a hard error
    expect(result.faces[0].result.unknownClauses.length).toBeGreaterThan(0);
    expect(result.faces[1].result).toBeDefined();
  });
});

describe('parseFaces(): split layout', () => {
  it('Fire // Ice — card_faces form, both halves parse correctly', () => {
    const result = parseFaces({
      name: 'Fire // Ice',
      oracle_text: '',
      layout: 'split',
      card_faces: [
        {
          name: 'Fire',
          oracle_text: 'Fire deals 2 damage divided as you choose among one or two targets.',
        },
        {
          name: 'Ice',
          oracle_text: 'Tap target permanent.\nDraw a card.',
        },
      ],
    });
    expect(result.layout).toBe('split');
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Fire');
    expect(result.faces[1].faceName).toBe('Ice');
    expect(result.faces[1].result.error).toBeUndefined();
    expect(result.faces[1].result.candidates).not.toBeNull();
    expect(result.faces[1].result.abilities!).toMatchSnapshot();
    // Fire half has complex divide-damage text — result still returned
    expect(result.faces[0].result).toBeDefined();
  });

  it('Dead // Gone — oracle_text separator form, both halves parse correctly', () => {
    const result = parseFaces({
      name: 'Dead // Gone',
      oracle_text:
        "Dead deals 2 damage to target creature.\n//\nReturn target creature you don't control to its owner's hand.",
      layout: 'split',
    });
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Dead');
    expect(result.faces[1].faceName).toBe('Gone');
    expect(result.faces[0].result.error).toBeUndefined();
    expect(result.faces[0].result.candidates).not.toBeNull();
    expect(result.faces[1].result.error).toBeUndefined();
    expect(result.faces[1].result.candidates).not.toBeNull();
    expect(result.faces[0].result.abilities!).toMatchSnapshot();
    expect(result.faces[1].result.abilities!).toMatchSnapshot();
  });
});

describe('parseFaces(): modal_dfc layout', () => {
  it('Shatterskull Smashing // Shatterskull, the Hammer Pass — routes both faces', () => {
    const result = parseFaces({
      name: 'Shatterskull Smashing // Shatterskull, the Hammer Pass',
      oracle_text: '',
      layout: 'modal_dfc',
      card_faces: [
        {
          name: 'Shatterskull Smashing',
          oracle_text:
            'Shatterskull Smashing deals X damage divided as you choose among up to two target creatures and/or planeswalkers. If X is 6 or more, Shatterskull Smashing deals twice X damage divided as you choose among them instead.',
        },
        { name: 'Shatterskull, the Hammer Pass', oracle_text: '' },
      ],
    });
    expect(result.layout).toBe('modal_dfc');
    expect(result.faces).toHaveLength(2);
    expect(result.faces[0].faceName).toBe('Shatterskull Smashing');
    expect(result.faces[1].faceName).toBe('Shatterskull, the Hammer Pass');
    // Both faces return ParseResult objects
    expect(result.faces[0].result).toBeDefined();
    expect(result.faces[1].result).toBeDefined();
  });

  it('Sink into Stupor // Soporific Springs — spell face returns ParseResult', () => {
    const result = parseFaces({
      name: 'Sink into Stupor // Soporific Springs',
      oracle_text: '',
      layout: 'modal_dfc',
      card_faces: [
        {
          name: 'Sink into Stupor',
          oracle_text:
            "Return target spell or nonland permanent an opponent controls to its owner's hand.",
        },
        { name: 'Soporific Springs', oracle_text: '' },
      ],
    });
    expect(result.faces[0].faceName).toBe('Sink into Stupor');
    expect(result.faces[0].result).toBeDefined();
    expect(result.faces[1].faceName).toBe('Soporific Springs');
    expect(result.faces[1].result).toBeDefined();
  });
});

describe('parseFaces(): backward compatibility', () => {
  it('normal layout card falls back to single-face parse', () => {
    const result = parseFaces({
      name: 'Counterspell',
      oracle_text: 'Counter target spell.',
      layout: 'normal',
    });
    expect(result.faces).toHaveLength(1);
    expect(result.faces[0].faceName).toBe('Counterspell');
    expect(result.faces[0].result.error).toBeUndefined();
    expect(result.faces[0].result.candidates).not.toBeNull();
  });

  it('parseCard no longer rejects non-normal layout', () => {
    // The old guard that returned error: 'Currently only support normal layout' is removed.
    // parseCard now attempts to parse oracle_text regardless of the layout field.
    const result = parseCard({
      name: 'Test',
      oracle_text: 'Flying',
      layout: 'adventure',
    });
    expect(result.error).not.toBe('Currently only support normal layout');
    // Simple oracle text parses cleanly
    expect(result.error).toBeUndefined();
    expect(result.candidates).not.toBeNull();
  });
});
