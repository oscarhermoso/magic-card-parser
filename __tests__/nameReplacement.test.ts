import { describe, it, expect } from 'vitest';
import { replaceCardName } from '../src/nameReplacement.js';

describe('replaceCardName', () => {
  it('replaces simple names', () => {
    expect(replaceCardName('Lightning Bolt deals 3 damage to any target.', 'Lightning Bolt'))
      .toBe('~ deals 3 damage to any target.');
  });

  it('replaces comma-shortened names', () => {
    const text = 'When you cast this spell, draw four cards.\nAnnihilator 4\nWhen Kozilek, Butcher of Truth is put into a graveyard from anywhere, its owner shuffles their graveyard into their library.';
    const result = replaceCardName(text, 'Kozilek, Butcher of Truth');
    expect(result).toContain('when ~ is put into');
    expect(result).not.toContain('kozilek');
  });

  it('replaces title-shortened names (of the)', () => {
    const text = 'Vigilance\nWhen Loran enters, destroy up to one target artifact or enchantment.';
    const result = replaceCardName(text, 'Loran of the Third Path');
    expect(result).toContain('when ~ enters');
    expect(result).not.toContain('loran');
  });

  it('replaces title-shortened names (the)', () => {
    const text = 'Indestructible, haste\nHazoret can\'t attack or block unless you have one or fewer cards in hand.';
    const result = replaceCardName(text, 'Hazoret the Fervent');
    expect(result).toContain("~ can't attack");
    expect(result).not.toContain('hazoret');
  });

  it('does NOT replace common MTG words used as first names', () => {
    // "Goblin" should not be replaced since it's a common creature type
    const text = 'Other Goblin creatures you control attack each combat if able.';
    const result = replaceCardName(text, 'Goblin Rabblemaster');
    expect(result).toContain('goblin creatures');
  });

  it('replaces first-word references in oracle text (case-sensitive, pre-lowercase)', () => {
    // "Loran" appears in oracle text as-is (case-sensitive match before lowercasing)
    const text = 'Vigilance\nWhen Loran enters, destroy up to one target artifact or enchantment.';
    const result = replaceCardName(text, 'Loran of the Third Path');
    expect(result).toContain('when ~ enters');
  });

  it('handles multi-word names with comma (Ob Nixilis)', () => {
    const text = 'Ob Nixilis, Captive Kingpin does something.';
    const result = replaceCardName(text, 'Ob Nixilis, Captive Kingpin');
    expect(result).toBe('~ does something.');
  });

  it('replaces self-references: this creature', () => {
    const text = 'When this creature enters, draw a card.';
    const result = replaceCardName(text, 'Wall of Omens');
    expect(result).toBe('when ~ enters, draw a card.');
  });

  it('replaces self-references: this artifact', () => {
    const text = 'This artifact enters tapped.';
    const result = replaceCardName(text, 'Worn Powerstone');
    expect(result).toBe('~ enters tapped.');
  });

  it('replaces self-references: this land', () => {
    const text = '{T}, Sacrifice this land: Destroy target land.';
    const result = replaceCardName(text, 'Strip Mine');
    expect(result).toBe('{t}, sacrifice ~: destroy target land.');
  });

  it('replaces self-references: this aura', () => {
    const text = 'When this Aura enters, do something.';
    const result = replaceCardName(text, 'Animate Dead');
    expect(result).toBe('when ~ enters, do something.');
  });

  it('lowercases the result', () => {
    const result = replaceCardName('Draw a CARD.', 'Test Card');
    expect(result).toBe('draw a card.');
  });

  it('does not replace short first names (3 chars or less)', () => {
    // "Sol" from "Sol Ring" is too short to be a reliable abbreviation
    const text = '{T}: Add {C}{C}.';
    const result = replaceCardName(text, 'Sol Ring');
    // Should still replace the full name but not "Sol" alone
    expect(result).toBe('{t}: add {c}{c}.');
  });

  it('does not replace first name when it equals shortened name', () => {
    // Single-word name: firstName === shortenedName, skip first-word replacement
    const text = 'Armageddon destroys all lands.';
    const result = replaceCardName(text, 'Armageddon');
    expect(result).toBe('~ destroys all lands.');
  });
});
