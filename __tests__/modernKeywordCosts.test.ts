import { describe, it, expect } from 'vitest';
import { parseCard } from '../src/magicCardParser.js';

// Cards from PARSER_GAP_AUDIT.md F1 (pa-bor). Each must parse at
// confidence 1.0 with no unknownClauses. Canonical Scryfall oracle text.
const cards = [
  {
    name: 'Boseiju, Who Endures',
    oracle_text:
      "{T}: Add {G}.\nChannel — {1}{G}, Discard Boseiju, Who Endures: Destroy target artifact, enchantment, or nonbasic land. That permanent's controller may search their library for a basic land card, put it onto the battlefield, then shuffle.",
  },
  {
    name: 'Eiganjo, Seat of the Empire',
    oracle_text:
      '{T}: Add {W}.\nChannel — {2}{W}, Discard Eiganjo, Seat of the Empire: Target creature gets -2/-2 until end of turn.',
  },
  {
    name: 'Otawara, Soaring City',
    oracle_text:
      "{T}: Add {U}.\nChannel — {2}{U}, Discard Otawara, Soaring City: Return target nonland permanent to its owner's hand.",
  },
  {
    name: 'Takenuma, Abandoned Mire',
    oracle_text:
      '{T}: Add {B}.\nChannel — {2}{B}, Discard Takenuma, Abandoned Mire: Put target creature or planeswalker card from your graveyard on top of your library.',
  },
  {
    name: 'Endurance',
    oracle_text:
      'Flash\nReach, trample\nEvoke—Exile a green card from your hand.\nWhen Endurance enters, target player puts all the cards from their graveyard on the bottom of their library in a random order.',
  },
  {
    name: 'Fugitive Codebreaker',
    oracle_text:
      'Disguise {2}{R}\nWhen Fugitive Codebreaker is turned face up, it deals 2 damage to any target.',
  },
  {
    name: 'Hexdrinker',
    oracle_text: 'Level up {1} ({1}: Put a level counter on this. Level up only as a sorcery.)',
  },
  {
    name: 'Slickshot Show-Off',
    oracle_text: 'Flying, trample, haste\nPlot {R}',
  },
  {
    name: 'Zephyrim',
    oracle_text: 'Flying\nSquad {1}{W}',
  },
  {
    name: 'Rabbit Battery',
    oracle_text: 'Haste\nEquipped creature gets +1/+0 and has haste.\nReconfigure {1}{R}',
  },
  {
    name: 'Shelldock Isle',
    oracle_text:
      'Hideaway 4\n{T}: Add {U}.\n{U}, {T}: You may cast the exiled card without paying its mana cost if an opponent has ten or fewer cards in their library.',
  },
  {
    name: 'Glimmer Lens',
    oracle_text: 'For Mirrodin!\nEquipped creature gets +1/+0 and has flying.\nEquip {2}',
  },
  {
    name: 'Bloodthorn Flail',
    oracle_text: 'Equipped creature gets +2/+0 and has menace.\nEquip—Pay {3} or discard a card.',
  },
];

describe('modern keyword cost variants (pa-bor)', () => {
  for (const card of cards) {
    it(`${card.name} parses at confidence 1.0 with no unknown clauses`, () => {
      const result = parseCard(card);
      expect(result.error).toBeUndefined();
      expect(result.abilities).not.toBeNull();
      expect(result.unknownClauses).toEqual([]);
      expect(result.confidence).toBe(1);
    });
  }
});
