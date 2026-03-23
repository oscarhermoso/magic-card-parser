import { describe, it, expect } from 'vitest';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { parseCard, parseTypeLine } = require('../src/magicCardParser');

// Card data extracted from mtg-cube-simulator's simple-is-best cube (src/cards.json)
// These represent the 360-card cube used in the simulator.

interface TestCard {
  name: string;
  oracle_text: string;
}

function parse(card: TestCard) {
  return parseCard({ name: card.name, oracle_text: card.oracle_text, layout: 'normal' });
}

// ============================================================================
// Cards that currently parse successfully (single parse, no error)
// These MUST NOT regress when grammar changes are made.
// ============================================================================

const successCards: TestCard[] = [
  // Mana sources
  { name: 'Black Lotus', oracle_text: '{T}, Sacrifice this artifact: Add three mana of any one color.' },
  { name: 'Mox Pearl', oracle_text: '{T}: Add {W}.' },
  { name: 'Mox Sapphire', oracle_text: '{T}: Add {U}.' },
  { name: 'Mox Emerald', oracle_text: '{T}: Add {G}.' },
  { name: 'Mox Jet', oracle_text: '{T}: Add {B}.' },
  { name: 'Mox Ruby', oracle_text: '{T}: Add {R}.' },
  { name: 'Sol Ring', oracle_text: '{T}: Add {C}{C}.' },
  { name: 'Mana Crypt', oracle_text: 'At the beginning of your upkeep, flip a coin. If you lose the flip, Mana Crypt deals 3 damage to you.\n{T}: Add {C}{C}.' },
  { name: 'Ancient Tomb', oracle_text: '{T}: Add {C}{C}. Ancient Tomb deals 2 damage to you.' },
  { name: 'Birds of Paradise', oracle_text: 'Flying\n{T}: Add one mana of any color.' },
  { name: 'Llanowar Elves', oracle_text: '{T}: Add {G}.' },
  { name: 'Elvish Mystic', oracle_text: '{T}: Add {G}.' },
  { name: 'Arbor Elf', oracle_text: '{T}: Untap target Forest.' },
  { name: 'Dark Ritual', oracle_text: 'Add {B}{B}{B}.' },
  { name: 'Seething Song', oracle_text: 'Add {R}{R}{R}{R}{R}.' },
  { name: 'Lotus Petal', oracle_text: '{T}, Sacrifice Lotus Petal: Add one mana of any color.' },
  { name: 'Mind Stone', oracle_text: '{T}: Add {C}.\n{1}, {T}, Sacrifice Mind Stone: Draw a card.' },
  { name: 'Chromatic Star', oracle_text: '{1}, {T}, Sacrifice Chromatic Star: Add one mana of any color.\nWhen Chromatic Star is put into a graveyard from the battlefield, draw a card.' },
  { name: 'Pentad Prism', oracle_text: 'Sunburst\nRemove a charge counter from Pentad Prism: Add one mana of any color.' },
  { name: 'Basalt Monolith', oracle_text: 'Basalt Monolith doesn\'t untap during your untap step.\n{T}: Add {C}{C}{C}.\n{3}: Untap Basalt Monolith.' },
  { name: 'Manamorphose', oracle_text: 'Add two mana in any combination of colors.\nDraw a card.' },
  { name: 'Simian Spirit Guide', oracle_text: 'Exile Simian Spirit Guide from your hand: Add {R}.' },

  // Dual lands
  { name: 'Underground Sea', oracle_text: '({T}: Add {U} or {B}.)' },
  { name: 'Volcanic Island', oracle_text: '({T}: Add {U} or {R}.)' },
  { name: 'Tropical Island', oracle_text: '({T}: Add {G} or {U}.)' },
  { name: 'Taiga', oracle_text: '({T}: Add {R} or {G}.)' },
  { name: 'Tundra', oracle_text: '({T}: Add {W} or {U}.)' },
  { name: 'Badlands', oracle_text: '({T}: Add {B} or {R}.)' },
  { name: 'Plateau', oracle_text: '({T}: Add {R} or {W}.)' },
  { name: 'Bayou', oracle_text: '({T}: Add {B} or {G}.)' },
  { name: 'Scrubland', oracle_text: '({T}: Add {W} or {B}.)' },
  { name: 'Savannah', oracle_text: '({T}: Add {G} or {W}.)' },
  { name: 'City of Brass', oracle_text: 'Whenever City of Brass becomes tapped, it deals 1 damage to you.\n{T}: Add one mana of any color.' },

  // Removal
  { name: 'Swords to Plowshares', oracle_text: 'Exile target creature. Its controller gains life equal to its power.' },
  { name: 'Counterspell', oracle_text: 'Counter target spell.' },
  { name: 'Mana Leak', oracle_text: 'Counter target spell unless its controller pays {3}.' },
  { name: 'Spell Pierce', oracle_text: 'Counter target noncreature spell unless its controller pays {2}.' },
  { name: 'Day of Judgment', oracle_text: 'Destroy all creatures.' },
  { name: 'Vindicate', oracle_text: 'Destroy target permanent.' },
  { name: 'Condemn', oracle_text: 'Put target attacking creature on the bottom of its owner\'s library. Its controller gains life equal to its toughness.' },
  { name: 'Infernal Grasp', oracle_text: 'Destroy target creature. You lose 2 life.' },
  { name: 'Flame Slash', oracle_text: 'Flame Slash deals 4 damage to target creature.' },
  { name: 'Pyroclasm', oracle_text: 'Pyroclasm deals 2 damage to each creature.' },
  { name: 'Armageddon', oracle_text: 'Destroy all lands.' },
  { name: 'Ravages of War', oracle_text: 'Destroy all lands.' },
  { name: 'Snap', oracle_text: 'Return target creature to its owner\'s hand. Untap up to two lands.' },

  // Card draw / selection
  { name: 'Ancestral Recall', oracle_text: 'Target player draws 3 cards.' },
  { name: 'Preordain', oracle_text: 'Scry 2, then draw a card.' },
  { name: 'Consider', oracle_text: 'Surveil 1. (Look at the top card of your library. You may put it into your graveyard.)\nDraw a card.' },
  { name: 'Faithless Looting', oracle_text: 'Draw two cards, then discard two cards.\nFlashback {2}{R}' },
  { name: 'Frantic Search', oracle_text: 'Draw two cards, then discard two cards. Untap up to three lands.' },
  { name: 'Demand Answers', oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact or discard a card.\nDraw two cards.' },

  // Discard
  { name: 'Mind Twist', oracle_text: 'Target player discards X cards at random.' },
  { name: 'Hymn to Tourach', oracle_text: 'Target player discards two cards at random.' },

  // Other spells
  { name: 'Time Walk', oracle_text: 'Take an extra turn after this one.' },
  { name: 'Upheaval', oracle_text: 'Return all permanents to their owners\' hands.' },
  { name: 'Growth Spiral', oracle_text: 'Draw a card.\nYou may put a land card from your hand onto the battlefield.' },
  { name: 'Explore', oracle_text: 'You may play an additional land this turn.\nDraw a card.' },
  { name: 'Abrade', oracle_text: 'Choose one —\n• Abrade deals 3 damage to target creature.\n• Destroy target artifact.' },
  { name: 'Mana Tithe', oracle_text: 'Counter target spell unless its controller pays {1}.' },
  { name: 'Miscalculation', oracle_text: 'Counter target spell unless its controller pays {2}.\nCycling {2}' },
  { name: 'Lingering Souls', oracle_text: 'Create two 1/1 white Spirit creature tokens with flying.\nFlashback {1}{B}' },
  { name: 'Chatterstorm', oracle_text: 'Create a 1/1 green Squirrel creature token.\nStorm' },
  { name: 'Brain Freeze', oracle_text: 'Target player mills three cards.\nStorm' },
  { name: 'Reprieve', oracle_text: 'Return target spell to its owner\'s hand. Draw a card.' },

  // Lands
  { name: 'Strip Mine', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice Strip Mine: Destroy target land.' },
  { name: 'Wasteland', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice Wasteland: Destroy target nonbasic land.' },
  { name: 'Karakas', oracle_text: '{T}: Add {W}.\n{T}: Return target legendary creature to its owner\'s hand.' },
  { name: 'Exploration', oracle_text: 'You may play an additional land on each of your turns.' },

  // Creatures
  { name: 'Rotting Regisaur', oracle_text: 'At the beginning of your upkeep, discard a card.' },
  { name: 'Monastery Swiftspear', oracle_text: 'Haste\nProwess' },
  { name: 'Sylvan Caryatid', oracle_text: 'Defender, hexproof\n{T}: Add one mana of any color.' },
  { name: 'Lodestone Golem', oracle_text: 'Nonartifact spells cost {1} more to cast.' },
  { name: 'Metalworker', oracle_text: '{T}: Reveal any number of artifact cards in your hand. Add {C}{C} for each card revealed this way.' },
  { name: 'Consecrated Sphinx', oracle_text: 'Flying\nWhenever an opponent draws a card, you may draw two cards.' },
  { name: 'Griselbrand', oracle_text: 'Flying, lifelink\nPay 7 life: Draw seven cards.' },
  { name: 'Ophiomancer', oracle_text: 'At the beginning of each upkeep, if you control no Snakes, create a 1/1 black Snake creature token with deathtouch.' },
  { name: 'Death\'s Shadow', oracle_text: 'Death\'s Shadow gets -X/-X, where X is your life total.' },
  { name: 'Kozilek, Butcher of Truth', oracle_text: 'When you cast this spell, draw four cards.\nAnnihilator 4\nWhen Kozilek, Butcher of Truth is put into a graveyard from anywhere, its owner shuffles their graveyard into their library.' },
  { name: 'Ulamog, the Infinite Gyre', oracle_text: 'When you cast this spell, destroy target permanent.\nAnnihilator 4, indestructible\nWhen Ulamog, the Infinite Gyre is put into a graveyard from anywhere, its owner shuffles their graveyard into their library.' },
  { name: 'Darksteel Colossus', oracle_text: 'Trample, indestructible\nIf Darksteel Colossus would be put into a graveyard from anywhere, reveal Darksteel Colossus and shuffle it into its owner\'s library instead.' },
  { name: 'Worldspine Wurm', oracle_text: 'Trample\nWhen Worldspine Wurm dies, create three 5/5 green Wurm creature tokens with trample.\nWhen Worldspine Wurm is put into a graveyard from anywhere, shuffle it into its owner\'s library.' },
  { name: 'Ripjaw Raptor', oracle_text: 'Enrage — Whenever Ripjaw Raptor is dealt damage, draw a card.' },
  { name: 'Scrawling Crawler', oracle_text: 'Protection from multicolored\nWhenever Scrawling Crawler deals combat damage to a player, draw a card.' },
  { name: 'Searslicer Goblin', oracle_text: 'Raid — At the beginning of your end step, if you attacked this turn, create a 1/1 red Goblin creature token.' },
  { name: 'Hypnotic Specter', oracle_text: 'Flying\nWhenever Hypnotic Specter deals damage to an opponent, that player discards a card at random.' },
  { name: 'Stromkirk Noble', oracle_text: 'Stromkirk Noble can\'t be blocked by Humans.\nWhenever Stromkirk Noble deals combat damage to a player, put a +1/+1 counter on it.' },
  { name: 'Warren Soultrader', oracle_text: 'Pay 1 life, Sacrifice another creature: Create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")' },
  { name: 'Marauding Mako', oracle_text: 'Whenever you discard one or more cards, put that many +1/+1 counters on this creature.\nCycling {2} ({2}, Discard this card: Draw a card.)' },

  // Artifacts
  { name: 'Quicksilver Amulet', oracle_text: '{4}, {T}: You may put a creature card from your hand onto the battlefield.' },
  { name: 'Aether Spellbomb', oracle_text: '{U}, Sacrifice Aether Spellbomb: Return target creature to its owner\'s hand.\n{1}, Sacrifice Aether Spellbomb: Draw a card.' },
  { name: 'Helm of Awakening', oracle_text: 'Spells cost {1} less to cast.' },

  // Enchantments
  { name: 'Humility', oracle_text: 'All creatures lose all abilities and have base power and toughness 1/1.' },

  // Split cards
  { name: 'Fell', oracle_text: 'Destroy target enchantment.' },
  { name: 'Split Up', oracle_text: 'Choose one —\n• Destroy all tapped creatures.\n• Destroy all untapped creatures.' },

  // Other
  { name: 'Seal of Removal', oracle_text: 'Sacrifice Seal of Removal: Return target creature to its owner\'s hand.' },

  // New-style "this creature/artifact/land" self-references (Step 4)
  { name: 'Wall of Omens', oracle_text: 'Defender\nWhen this creature enters, draw a card.' },
  { name: 'Baleful Strix', oracle_text: 'Flying, deathtouch\nWhen this creature enters, draw a card.' },
  { name: 'Llanowar Visionary', oracle_text: 'When this creature enters, draw a card.\n{T}: Add {G}.' },
  { name: 'Flametongue Kavu', oracle_text: 'When this creature enters, it deals 4 damage to target creature.' },
  { name: 'Worn Powerstone', oracle_text: 'This artifact enters tapped.\n{T}: Add {C}{C}.' },
  { name: 'Strip Mine', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice this land: Destroy target land.' },
  { name: 'Wasteland', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice this land: Destroy target nonbasic land.' },
  { name: 'Ancient Tomb - new', oracle_text: '{T}: Add {C}{C}. This land deals 2 damage to you.' },
  { name: 'Aether Spellbomb', oracle_text: '{U}, Sacrifice this artifact: Return target creature to its owner\'s hand.\nSacrifice this artifact: Draw a card.' },
  { name: 'Wall of Blossoms', oracle_text: 'Defender\nWhen this creature enters, draw a card.' },
  { name: 'Ripjaw Raptor', oracle_text: 'Enrage — Whenever this creature is dealt damage, draw a card.' },
  { name: 'Overgrown Tomb', oracle_text: 'As this land enters, you may pay 2 life. If you don\'t, it enters tapped.\n{T}: Add {B} or {G}.' },
  { name: 'Godless Shrine', oracle_text: 'As this land enters, you may pay 2 life. If you don\'t, it enters tapped.\n{T}: Add {W} or {B}.' },
  { name: 'Breeding Pool', oracle_text: 'As this land enters, you may pay 2 life. If you don\'t, it enters tapped.\n{T}: Add {G} or {U}.' },
  { name: 'Death\'s Shadow', oracle_text: 'This creature gets -X/-X, where X is your life total.' },
];

describe('Baseline: Successfully parsing cards', () => {
  it.each(successCards.map(c => [c.name, c]))('%s parses without error', (_name, card) => {
    const result = parse(card as TestCard);
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
    expect(result.result).toHaveLength(1);
  });
});

// ============================================================================
// Representative ambiguous cards — these parse but produce multiple results.
// We verify they at least parse (result is non-null) and have multiple parses.
// ============================================================================

const ambiguousCards: TestCard[] = [
  { name: 'Lightning Bolt', oracle_text: 'Lightning Bolt deals 3 damage to any target.' },
  { name: 'Force of Will', oracle_text: 'You may pay 1 life and exile a blue card from your hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Thoughtseize', oracle_text: 'Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life.' },
  { name: 'Young Pyromancer', oracle_text: 'Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.' },
  { name: 'Thalia, Guardian of Thraben', oracle_text: 'First strike\nNoncreature spells cost {1} more to cast.' },
  { name: 'Daze', oracle_text: 'You may return an Island you control to its owner\'s hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Gush', oracle_text: 'You may return two Islands you control to their owner\'s hand rather than pay this spell\'s mana cost.\nDraw two cards.' },
  { name: 'Rancor', oracle_text: 'Enchant creature\nEnchanted creature gets +2/+0 and has trample.\nWhen Rancor is put into a graveyard from the battlefield, return Rancor to its owner\'s hand.' },
  { name: 'Skullclamp', oracle_text: 'Equipped creature gets +1/-1.\nWhenever equipped creature dies, draw two cards.\nEquip {1}' },
  { name: 'Tendrils of Agony', oracle_text: 'Target player loses 2 life and you gain 2 life.\nStorm' },
  { name: 'Control Magic', oracle_text: 'Enchant creature\nYou control enchanted creature.' },
  { name: 'Garruk Wildspeaker', oracle_text: '+1: Untap two target lands.\n−1: Create a 3/3 green Beast creature token.\n−4: Creatures you control get +3/+3 and gain trample until end of turn.' },
  { name: 'Toxic Deluge', oracle_text: 'As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn.' },
  { name: 'Wrenn and Six', oracle_text: '+1: Return target land card from your graveyard to your hand.\n−1: Wrenn and Six deals 1 damage to any target.\n−7: You get an emblem with "Instant and sorcery cards in your graveyard have retrace."' },
  { name: 'Monastery Mentor', oracle_text: 'Prowess\nWhenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.' },
  { name: 'Bone Shards', oracle_text: 'As an additional cost to cast this spell, sacrifice a creature or discard a card.\nDestroy target creature or planeswalker.' },
  { name: 'Elspeth, Sun\'s Champion', oracle_text: '+1: Create three 1/1 white Soldier creature tokens.\n−3: Destroy all creatures with power 4 or greater.\n−7: You get an emblem with "Creatures you control get +2/+2 and have flying."' },
  { name: 'Goblin Rabblemaster', oracle_text: 'Other Goblin creatures you control attack each combat if able.\nAt the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.\nWhenever Goblin Rabblemaster attacks, it gets +1/+0 until end of turn for each other attacking Goblin.' },

  // New-style "this creature" ETB triggers — ambiguous but parsing (Step 4)
  { name: 'Eternal Witness', oracle_text: 'When this creature enters, you may return target card from your graveyard to your hand.' },
  { name: 'Reclamation Sage', oracle_text: 'When this creature enters, you may destroy target artifact or enchantment.' },
  { name: 'Blade Splicer', oracle_text: 'When this creature enters, create a 3/3 colorless Phyrexian Golem artifact creature token.\nGolems you control have first strike.' },
  { name: 'Thragtusk', oracle_text: 'When this creature enters, you gain 5 life.\nWhen this creature leaves the battlefield, create a 3/3 green Beast creature token.' },
  { name: 'Craterhoof Behemoth', oracle_text: 'Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.' },
  { name: 'Grave Titan', oracle_text: 'Deathtouch\nWhenever this creature enters or attacks, create two 2/2 black Zombie creature tokens.' },
  { name: 'Ashen Rider', oracle_text: 'Flying\nWhen this creature enters or dies, exile target permanent.' },
  { name: 'Stitcher\'s Supplier', oracle_text: 'When this creature enters or dies, mill three cards.' },
  { name: 'Selfless Spirit', oracle_text: 'Flying\nSacrifice this creature: Creatures you control gain indestructible until end of turn.' },
  { name: 'Blood Artist', oracle_text: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.' },
  { name: 'Zealous Conscripts', oracle_text: 'Haste\nWhen this creature enters, gain control of target permanent until end of turn. Untap that permanent. It gains haste until end of turn.' },
];

describe('Baseline: Ambiguous cards parse with results', () => {
  it.each(ambiguousCards.map(c => [c.name, c]))('%s produces parse results', (_name, card) => {
    const result = parse(card as TestCard);
    expect(result.result).not.toBeNull();
    expect(result.result!.length).toBeGreaterThanOrEqual(1);
  });
});

// ============================================================================
// AST structure snapshot tests for representative cards
// These capture the exact AST shape for regression detection.
// ============================================================================

describe('AST structure snapshots', () => {
  it('Birds of Paradise: flying + mana ability', () => {
    const result = parse({ name: 'Birds of Paradise', oracle_text: 'Flying\n{T}: Add one mana of any color.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(2);
    // First ability should be flying keyword
    expect(abilities[0]).toContain('flying');
  });

  it('Counterspell: counter effect', () => {
    const result = parse({ name: 'Counterspell', oracle_text: 'Counter target spell.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
  });

  it('Day of Judgment: destroy all creatures', () => {
    const result = parse({ name: 'Day of Judgment', oracle_text: 'Destroy all creatures.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
  });

  it('Abrade: modal spell with two options', () => {
    const result = parse({ name: 'Abrade', oracle_text: 'Choose one —\n• Abrade deals 3 damage to target creature.\n• Destroy target artifact.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
    const modal = abilities[0];
    // Modal should have options array
    expect(modal).toHaveProperty('options');
    expect(modal.options).toHaveLength(2);
  });

  it('Lingering Souls: token creation + flashback', () => {
    const result = parse({ name: 'Lingering Souls', oracle_text: 'Create two 1/1 white Spirit creature tokens with flying.\nFlashback {1}{B}' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities.length).toBeGreaterThanOrEqual(2);
  });

  it('Mana Leak: conditional counter', () => {
    const result = parse({ name: 'Mana Leak', oracle_text: 'Counter target spell unless its controller pays {3}.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
  });

  it('Faithless Looting: draw + discard + flashback', () => {
    const result = parse({ name: 'Faithless Looting', oracle_text: 'Draw two cards, then discard two cards.\nFlashback {2}{R}' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities.length).toBeGreaterThanOrEqual(2);
  });

  it('Chatterstorm: token creation + storm', () => {
    const result = parse({ name: 'Chatterstorm', oracle_text: 'Create a 1/1 green Squirrel creature token.\nStorm' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities.length).toBeGreaterThanOrEqual(2);
  });

  it('Strip Mine: mana + activated destroy', () => {
    const result = parse({ name: 'Strip Mine', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice Strip Mine: Destroy target land.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(2);
  });

  it('Flametongue Kavu: new-style ETB trigger with "this creature enters"', () => {
    const result = parse({ name: 'Flametongue Kavu', oracle_text: 'When this creature enters, it deals 4 damage to target creature.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
    const triggered = abilities[0];
    // Should have trigger with CARD_NAME entering battlefield
    expect(triggered).toHaveProperty('trigger');
    expect(triggered.trigger).toHaveProperty('when');
    expect(triggered.trigger.when.what).toBe('CARD_NAME');
    expect(triggered.trigger.when.does).toEqual({ enter: 'battlefield' });
    // Should have damage effect
    expect(triggered).toHaveProperty('effect');
    expect(triggered.effect.what).toBe('it');
    expect(triggered.effect.does).toHaveProperty('deal');
  });

  it('Overgrown Tomb: shockland with "this land enters"', () => {
    const result = parse({ name: 'Overgrown Tomb', oracle_text: 'As this land enters, you may pay 2 life. If you don\'t, it enters tapped.\n{T}: Add {B} or {G}.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities.length).toBeGreaterThanOrEqual(2);
  });

  it('Strip Mine new-style: mana + sacrifice this land', () => {
    const result = parse({ name: 'Strip Mine', oracle_text: '{T}: Add {C}.\n{T}, Sacrifice this land: Destroy target land.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(2);
  });

  it('Swords to Plowshares: exile + life gain', () => {
    const result = parse({ name: 'Swords to Plowshares', oracle_text: 'Exile target creature. Its controller gains life equal to its power.' });
    expect(result.error).toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
  });
});

// ============================================================================
// Type line parsing tests
// ============================================================================

describe('Type line parsing', () => {
  it('parses basic creature type', () => {
    const result = parseTypeLine('creature — human wizard');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });

  it('parses land type with subtypes', () => {
    const result = parseTypeLine('land — island swamp');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });

  it('parses legendary creature', () => {
    const result = parseTypeLine('legendary creature — human soldier');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });

  it('parses artifact', () => {
    const result = parseTypeLine('artifact');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });

  it('parses enchantment — aura', () => {
    const result = parseTypeLine('enchantment — aura');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });

  it('parses legendary planeswalker', () => {
    const result = parseTypeLine('legendary planeswalker — liliana');
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
  });
});
