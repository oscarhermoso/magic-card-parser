// @ts-nocheck — data-driven test file; type narrowing not needed for parse result assertions
import { describe, it, expect } from 'vitest';
import { parseCard, parseTypeLine } from '../src/magicCardParser.js';

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
// All cube cards — parsed and snapshot-tested for regression detection.
// Cards marked `ambiguous: true` may produce multiple parse results.
// ============================================================================

interface CubeCard extends TestCard {
  ambiguous?: boolean;
  parseError?: boolean;
}

const cubeCards: CubeCard[] = [
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

  // Step 8 batch 2: enters-with, becomes-target, during-duration, gain-life-equal, token-state, look-at-hand, damage-instead, number-of-tokens, counters-trigger
  { name: 'Shivan Devastator', oracle_text: 'Flying, haste\nThis creature enters with X +1/+1 counters on it.' },
  { name: 'Brimaz, King of Oreskos', oracle_text: 'Vigilance\nWhenever Brimaz attacks, create a 1/1 white Cat Soldier creature token with vigilance that\'s attacking.\nWhenever Brimaz blocks a creature, create a 1/1 white Cat Soldier creature token with vigilance that\'s blocking that creature.' },
  { name: 'Razorkin Needlehead', oracle_text: 'This creature has first strike during your turn.\nWhenever an opponent draws a card, this creature deals 1 damage to them.' },
  { name: 'Krenko, Tin Street Kingpin', oracle_text: 'Whenever Krenko attacks, put a +1/+1 counter on it, then create a number of 1/1 red Goblin creature tokens equal to Krenko\'s power.' },
  { name: 'Noxious Gearhulk', oracle_text: 'Menace\nWhen this creature enters, you may destroy another target creature. If a creature is destroyed this way, you gain life equal to its toughness.' },
  { name: 'Gitaxian Probe', oracle_text: '({U/P} can be paid with either {U} or 2 life.)\nLook at target player\'s hand.\nDraw a card.' },
  { name: 'Dark Confidant', oracle_text: 'At the beginning of your upkeep, reveal the top card of your library and put that card into your hand. You lose life equal to its mana value.' },
  { name: 'Flickerwisp', oracle_text: 'Flying\nWhen this creature enters, exile another target permanent. Return that card to the battlefield under its owner\'s control at the beginning of the next end step.' },

  // Step 8 batch 4: tapped-for-mana, countered-this-way, becomes-creature, base-p/t, mana-restriction
  { name: 'Remand', oracle_text: 'Counter target spell. If that spell is countered this way, put it into its owner\'s hand instead of into that player\'s graveyard.\nDraw a card.' },
  { name: 'Memory Lapse', oracle_text: 'Counter target spell. If that spell is countered this way, put it on top of its owner\'s library instead of into that player\'s graveyard.' },
  { name: 'High Tide', oracle_text: 'Until end of turn, whenever a player taps an Island for mana, that player adds an additional {U}.' },
  { name: 'Mana Drain', oracle_text: 'Counter target spell. At the beginning of your next main phase, add an amount of {C} equal to that spell\'s mana value.' },
  { name: 'Kudo, King Among Bears', oracle_text: 'Other creatures have base power and toughness 2/2 and are Bears in addition to their other types.' },
  { name: 'Mishra\'s Workshop', oracle_text: '{T}: Add {C}{C}{C}. Spend this mana only to cast artifact spells.' },
  { name: 'Heartbeat of Spring', oracle_text: 'Whenever a player taps a land for mana, that player adds one mana of any type that land produced.' },
  { name: 'Mana Flare', oracle_text: 'Whenever a player taps a land for mana, that player adds one mana of any type that land produced.' },

  // Formerly ambiguous, now unambiguous after grammar restructuring (Step 5, commit 7d10662)
  { name: 'Lightning Bolt', oracle_text: 'Lightning Bolt deals 3 damage to any target.' },
  { name: 'Thoughtseize', oracle_text: 'Target player reveals their hand. You choose a nonland card from it. That player discards that card. You lose 2 life.' },
  { name: 'Thalia, Guardian of Thraben', oracle_text: 'First strike\nNoncreature spells cost {1} more to cast.' },
  { name: 'Rancor', oracle_text: 'Enchant creature\nEnchanted creature gets +2/+0 and has trample.\nWhen Rancor is put into a graveyard from the battlefield, return Rancor to its owner\'s hand.' },
  { name: 'Skullclamp', oracle_text: 'Equipped creature gets +1/-1.\nWhenever equipped creature dies, draw two cards.\nEquip {1}' },
  { name: 'Control Magic', oracle_text: 'Enchant creature\nYou control enchanted creature.' },
  { name: 'Toxic Deluge', oracle_text: 'As an additional cost to cast this spell, pay X life.\nAll creatures get -X/-X until end of turn.' },
  { name: 'Monastery Mentor', oracle_text: 'Prowess\nWhenever you cast a noncreature spell, create a 1/1 white Monk creature token with prowess.' },
  { name: 'Elspeth, Sun\'s Champion', oracle_text: '+1: Create three 1/1 white Soldier creature tokens.\n−3: Destroy all creatures with power 4 or greater.\n−7: You get an emblem with "Creatures you control get +2/+2 and have flying."' },
  { name: 'Goblin Rabblemaster', oracle_text: 'Other Goblin creatures you control attack each combat if able.\nAt the beginning of combat on your turn, create a 1/1 red Goblin creature token with haste.\nWhenever Goblin Rabblemaster attacks, it gets +1/+0 until end of turn for each other attacking Goblin.' },
  { name: 'Grave Titan', oracle_text: 'Deathtouch\nWhenever this creature enters or attacks, create two 2/2 black Zombie creature tokens.' },
  { name: 'Ashen Rider', oracle_text: 'Flying\nWhen this creature enters or dies, exile target permanent.' },
  { name: 'Stitcher\'s Supplier', oracle_text: 'When this creature enters or dies, mill three cards.' },
  { name: 'Selfless Spirit', oracle_text: 'Flying\nSacrifice this creature: Creatures you control gain indestructible until end of turn.' },
  { name: 'Demonic Tutor', oracle_text: 'Search your library for a card, put that card into your hand, then shuffle.' },
  { name: 'Entomb', oracle_text: 'Search your library for a card, put that card into your graveyard, then shuffle.' },
  { name: 'Tinker', oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact.\nSearch your library for an artifact card, put that card onto the battlefield, then shuffle.' },
  { name: 'Crop Rotation', oracle_text: 'As an additional cost to cast this spell, sacrifice a land.\nSearch your library for a land card, put that card onto the battlefield, then shuffle.' },
  { name: 'Fauna Shaman', oracle_text: '{G}, {T}, Discard a creature card: Search your library for a creature card, reveal it, put it into your hand, then shuffle.' },
  { name: 'Sakura-Tribe Elder', oracle_text: 'Sacrifice Sakura-Tribe Elder: Search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.' },
  { name: 'Prismatic Vista', oracle_text: '{T}, Pay 1 life, Sacrifice Prismatic Vista: Search your library for a basic land card, put it onto the battlefield, then shuffle.' },
  { name: 'Thraben Inspector', oracle_text: 'When Thraben Inspector enters, investigate. (Create a Clue token. It\'s an artifact with "{2}, Sacrifice this token: Draw a card.")' },
  { name: 'Tireless Tracker', oracle_text: 'Landfall — Whenever a land you control enters, investigate. (Create a Clue token. It\'s an artifact with "{2}, Sacrifice this token: Draw a card.")\nWhenever you sacrifice a Clue, put a +1/+1 counter on Tireless Tracker.' },
  { name: 'Reanimate', oracle_text: 'Put target creature card from a graveyard onto the battlefield under your control. You lose life equal to that card\'s mana value.' },
  { name: 'Urborg, Tomb of Yawgmoth', oracle_text: 'Each land is a Swamp in addition to its other land types.' },
  { name: 'Yavimaya, Cradle of Growth', oracle_text: 'Each land is a Forest in addition to its other land types.' },
  { name: 'Noble Hierarch', oracle_text: 'Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.)\n{T}: Add {G}, {W}, or {U}.' },
  { name: 'Ignoble Hierarch', oracle_text: 'Exalted (Whenever a creature you control attacks alone, that creature gets +1/+1 until end of turn.)\n{T}: Add {B}, {R}, or {G}.' },
  { name: 'Char', oracle_text: 'Char deals 4 damage to any target and 2 damage to you.' },
  { name: 'Lion\'s Eye Diamond', oracle_text: 'Discard your hand, Sacrifice Lion\'s Eye Diamond: Add three mana of any one color. Activate only as an instant.' },
  { name: 'Galvanic Blast', oracle_text: 'Galvanic Blast deals 2 damage to any target.\nMetalcraft — Galvanic Blast deals 4 damage instead if you control three or more artifacts.' },
  { name: 'Burst Lightning', oracle_text: 'Kicker {4} (You may pay an additional {4} as you cast this spell.)\nBurst Lightning deals 2 damage to any target. If this spell was kicked, it deals 4 damage instead.' },
  { name: 'Duress', oracle_text: 'Target opponent reveals their hand. You choose a noncreature, nonland card from it. That player discards that card.' },
  { name: 'Hushbringer', oracle_text: 'Flying, lifelink\nCreatures entering or dying don\'t cause abilities to trigger.' },
  { name: 'Yawgmoth\'s Bargain', oracle_text: 'Skip your draw step.\nPay 1 life: Draw a card.' },
  { name: 'Cabal Ritual', oracle_text: 'Add {B}{B}{B}.\nThreshold — Add {B}{B}{B}{B}{B} instead if there are seven or more cards in your graveyard.' },
  { name: 'Hero of Bladehold', oracle_text: 'Battle cry\nWhenever this creature attacks, create two 1/1 white Soldier creature tokens that are tapped and attacking.' },
  { name: 'Wild Growth', oracle_text: 'Enchant land\nWhenever enchanted land is tapped for mana, its controller adds an additional {G}.' },
  { name: 'Mutavault', oracle_text: '{T}: Add {C}.\n{1}: Mutavault becomes a 2/2 creature with all creature types until end of turn. It\'s still a land.' },
  { name: 'Sundering Titan', oracle_text: 'When Sundering Titan enters or leaves the battlefield, choose a land of each basic land type, then destroy those lands.' },
  // Moved from ambiguous after grammar restructuring (suffix from-zone fix)
  { name: 'Wrenn and Six', oracle_text: '+1: Return target land card from your graveyard to your hand.\n−1: Wrenn and Six deals 1 damage to any target.\n−7: You get an emblem with "Instant and sorcery cards in your graveyard have retrace."' },
  { name: 'Eternal Witness', oracle_text: 'When this creature enters, you may return target card from your graveyard to your hand.' },
  { name: 'Recurring Nightmare', oracle_text: 'Sacrifice a creature, Return Recurring Nightmare to its owner\'s hand: Return target creature card from your graveyard to the battlefield. Activate only as a sorcery.' },
  { name: 'Arclight Phoenix', oracle_text: 'Flying, haste\nAt the beginning of combat on your turn, if you\'ve cast three or more instant and sorcery spells this turn, return Arclight Phoenix from your graveyard to the battlefield.' },
  // Step 1: Infrastructure & simple grammar fixes
  { name: 'Greasewrench Goblin', oracle_text: 'Exhaust — {2}{R}: Discard up to two cards, then draw that many cards. Put a +1/+1 counter on this creature. (Activate each exhaust ability only once.)' },
  // Step 3: Vengevine — parses unambiguously (second creature spell trigger)
  { name: 'Vengevine', oracle_text: 'Haste\nWhenever you cast a spell, if it\'s the second creature spell you cast this turn, you may return this card from your graveyard to the battlefield.' },
  // Step 4: Replacement effects — Containment Priest, Hullbreacher, Lab Maniac parse unambiguously
  { name: 'Containment Priest', oracle_text: 'Flash\nIf a nontoken creature would enter and it wasn\'t cast, exile it instead.' },
  { name: 'Hullbreacher', oracle_text: 'Flash\nIf an opponent would draw a card except the first one they draw in each of their draw steps, instead you create a Treasure token. (It\'s an artifact with "{T}, Sacrifice this token: Add one mana of any color.")' },
  { name: 'Laboratory Maniac', oracle_text: 'If you would draw a card while your library has no cards in it, you win the game instead.' },
  // Step 5: Static restrictions — Ethersworn Canonist, Phyrexian Revoker parse unambiguously
  { name: 'Ethersworn Canonist', oracle_text: 'Each player who has cast a nonartifact spell this turn can\'t cast additional nonartifact spells.' },
  { name: 'Phyrexian Revoker', oracle_text: 'As this creature enters, choose a nonland card name. Activated abilities of sources with the chosen name can\'t be activated.' },
  // Step 6: Conditional triggered abilities — Laelia, Scrap Trawler parse unambiguously
  { name: 'Laelia, the Blade Reforged', oracle_text: 'Haste\nWhenever Laelia attacks, exile the top card of your library. You may play that card this turn.\nWhenever one or more cards are put into exile from your library and/or your graveyard, put a +1/+1 counter on Laelia.' },
  { name: 'Scrap Trawler', oracle_text: 'Whenever this creature dies or another artifact you control is put into a graveyard from the battlefield, return to your hand target artifact card in your graveyard with lesser mana value.' },
  // Step 7: Token & copy effects — Fractured Identity, Nettlecyst parse unambiguously
  { name: 'Fractured Identity', oracle_text: 'Exile target nonland permanent. Each player other than its controller creates a token that\'s a copy of it.' },
  { name: 'Nettlecyst', oracle_text: 'Living weapon (When this Equipment enters, create a 0/0 black Phyrexian Germ creature token, then attach this to it.)\nEquipped creature gets +1/+1 for each artifact and/or enchantment you control.\nEquip {2}' },
  // Step 8: Complex spells — Balance, Turnabout, Maze of Ith
  { name: 'Balance', oracle_text: 'Each player chooses a number of lands they control equal to the number of lands controlled by the player who controls the fewest, then sacrifices the rest. Players discard cards and sacrifice creatures the same way.', parseError: true },
  { name: 'Turnabout', oracle_text: 'Choose artifact, creature, or land. Tap all untapped permanents of the chosen type target player controls, or untap all tapped permanents of that type that player controls.', parseError: true },
  { name: 'Maze of Ith', oracle_text: '{T}: Untap target attacking creature. Prevent all combat damage that would be dealt to and dealt by that creature this turn.' },
  // Step 9: Complex spells part 2 — Flash, Sylvan Library, Animate Dead
  { name: 'Flash', oracle_text: 'You may put a creature card from your hand onto the battlefield. If you do, sacrifice it unless you pay its mana cost reduced by {2}.' },
  { name: 'Sylvan Library', oracle_text: 'At the beginning of your draw step, you may draw two additional cards. If you do, choose two cards in your hand drawn this turn. For each of those cards, pay 4 life or put the card on top of your library.' },
  { name: 'Animate Dead', oracle_text: 'Enchant creature card in a graveyard\nWhen this Aura enters, if it\'s on the battlefield, it loses "enchant creature card in a graveyard" and gains "enchant creature put onto the battlefield with this Aura." Return enchanted creature card to the battlefield under your control and attach this Aura to it. When this Aura leaves the battlefield, that creature\'s controller sacrifices it.\nEnchanted creature gets -1/-0.' },
  // Additional cube cards
  { name: 'Abbot of Keral Keep', oracle_text: 'Prowess (Whenever you cast a noncreature spell, this creature gets +1/+1 until end of turn.)\nWhen this creature enters, exile the top card of your library. Until end of turn, you may play that card.' },
  { name: 'Abiding Grace', oracle_text: 'At the beginning of your end step, choose one —\n• You gain 1 life.\n• Return target creature card with mana value 1 from your graveyard to the battlefield.' },
  { name: 'Accursed Marauder', oracle_text: 'When this creature enters, each player sacrifices a nontoken creature of their choice.' },
  { name: 'Anger', oracle_text: 'Haste\nAs long as this card is in your graveyard and you control a Mountain, creatures you control have haste.' },
  { name: 'Archangel of Thune', oracle_text: 'Flying\nLifelink (Damage dealt by this creature also causes you to gain that much life.)\nWhenever you gain life, put a +1/+1 counter on each creature you control.' },
  { name: 'Assassin\'s Trophy', oracle_text: 'Destroy target permanent an opponent controls. Its controller may search their library for a basic land card, put it onto the battlefield, then shuffle.' },
  { name: 'Auriok Salvagers', oracle_text: '{1}{W}: Return target artifact card with mana value 1 or less from your graveyard to your hand.' },
  { name: 'Banefire', oracle_text: 'Banefire deals X damage to any target.\nIf X is 5 or more, this spell can\'t be countered and the damage can\'t be prevented.' },
  { name: 'Batterskull', oracle_text: 'Living weapon (When this Equipment enters, create a 0/0 black Phyrexian Germ creature token, then attach this to it.)\nEquipped creature gets +4/+4 and has vigilance and lifelink.\n{3}: Return this Equipment to its owner\'s hand.\nEquip {5}' },
  { name: 'Bitter Triumph', oracle_text: 'As an additional cost to cast this spell, discard a card or pay 3 life.\nDestroy target creature or planeswalker.' },
  { name: 'Bitterblossom', oracle_text: 'At the beginning of your upkeep, you lose 1 life and create a 1/1 black Faerie Rogue creature token with flying.' },
  { name: 'Blood Crypt', oracle_text: '({T}: Add {B} or {R}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Bonesplitter', oracle_text: 'Equipped creature gets +2/+0.\nEquip {1}' },
  { name: 'Braids, Cabal Minion', oracle_text: 'At the beginning of each player\'s upkeep, that player sacrifices an artifact, creature, or land of their choice.' },
  { name: 'Burning of Xinye', oracle_text: 'You destroy four lands you control, then target opponent destroys four lands they control. Then Burning of Xinye deals 4 damage to each creature.' },
  { name: 'Champion of the Parish', oracle_text: 'Whenever another Human you control enters, put a +1/+1 counter on this creature.' },
  { name: 'Chromatic Lantern', oracle_text: 'Lands you control have "{T}: Add one mana of any color."\n{T}: Add one mana of any color.' },
  { name: 'Chrome Mox', oracle_text: 'Imprint — When this artifact enters, you may exile a nonartifact, nonland card from your hand.\n{T}: Add one mana of any of the exiled card\'s colors.' },
  { name: 'Commercial District', oracle_text: '({T}: Add {R} or {G}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Crucible of Worlds', oracle_text: 'You may play lands from your graveyard.' },
  { name: 'Cut Down', oracle_text: 'Destroy target creature with total power and toughness 5 or less.' },
  { name: 'Dauntless Bodyguard', oracle_text: 'As this creature enters, choose another creature you control.\nSacrifice this creature: The chosen creature gains indestructible until end of turn.' },
  { name: 'Dismember', oracle_text: '({B/P} can be paid with either {B} or 2 life.)\nTarget creature gets -5/-5 until end of turn.' },
  { name: 'Dragonlord Atarka', oracle_text: 'Flying, trample\nWhen Dragonlord Atarka enters, it deals 5 damage divided as you choose among any number of target creatures and/or planeswalkers your opponents control.' },
  { name: 'Echo of Eons', oracle_text: 'Each player shuffles their hand and graveyard into their library, then draws seven cards.\nFlashback {2}{U} (You may cast this card from your graveyard for its flashback cost. Then exile it.)' },
  { name: 'Eidolon of the Great Revel', oracle_text: 'Whenever a player casts a spell with mana value 3 or less, this creature deals 2 damage to that player.' },
  { name: 'Elegant Parlor', oracle_text: '({T}: Add {R} or {W}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Elvish Spirit Guide', oracle_text: 'Exile this creature from your hand: Add {G}.' },
  { name: 'Exhume', oracle_text: 'Each player puts a creature card from their graveyard onto the battlefield.' },
  { name: 'Fireblast', oracle_text: 'You may sacrifice two Mountains rather than pay this spell\'s mana cost.\nFireblast deals 4 damage to any target.' },
  { name: 'Firebolt', oracle_text: 'Firebolt deals 2 damage to any target.\nFlashback {4}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)' },
  { name: 'Gaea\'s Cradle', oracle_text: '{T}: Add {G} for each creature you control.' },
  { name: 'Genesis', oracle_text: 'At the beginning of your upkeep, if this creature is in your graveyard, you may pay {2}{G}. If you do, return target creature card from your graveyard to your hand.' },
  { name: 'Goblin Bombardment', oracle_text: 'Sacrifice a creature: This enchantment deals 1 damage to any target.' },
  { name: 'Goblin Welder', oracle_text: '{T}: Choose target artifact a player controls and target artifact card in that player\'s graveyard. If both targets are still legal as this ability resolves, that player simultaneously sacrifices the artifact and returns the artifact card to the battlefield.', parseError: true },
  { name: 'Grafted Wargear', oracle_text: 'Equipped creature gets +3/+2.\nWhenever this Equipment becomes unattached from a permanent, sacrifice that permanent.\nEquip {0} ({0}: Attach to target creature you control. Equip only as a sorcery.)' },
  { name: 'Grim Lavamancer', oracle_text: '{R}, {T}, Exile two cards from your graveyard: This creature deals 2 damage to any target.' },
  { name: 'Hallowed Fountain', oracle_text: '({T}: Add {W} or {U}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Haywire Mite', oracle_text: 'When this creature dies, you gain 2 life.\n{G}, Sacrifice this creature: Exile target noncreature artifact or noncreature enchantment.' },
  { name: 'Hedge Maze', oracle_text: '({T}: Add {G} or {U}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Hellrider', oracle_text: 'Haste\nWhenever a creature you control attacks, this creature deals 1 damage to the player or planeswalker it\'s attacking.' },
  { name: 'Indatha Triome', oracle_text: '({T}: Add {W}, {B}, or {G}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Inquisition of Kozilek', oracle_text: 'Target player reveals their hand. You choose a nonland card from it with mana value 3 or less. That player discards that card.' },
  { name: 'Isamaru, Hound of Konda', oracle_text: '' },
  { name: 'Jetmir\'s Garden', oracle_text: '({T}: Add {R}, {G}, or {W}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Ketria Triome', oracle_text: '({T}: Add {G}, {U}, or {R}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Languish', oracle_text: 'All creatures get -4/-4 until end of turn.' },
  { name: 'Legion Extruder', oracle_text: 'When this artifact enters, it deals 2 damage to any target.\n{2}, {T}, Sacrifice another artifact: Create a 3/3 colorless Golem artifact creature token.' },
  { name: 'Lightning Helix', oracle_text: 'Lightning Helix deals 3 damage to any target and you gain 3 life.' },
  { name: 'Liliana of the Veil', oracle_text: '+1: Each player discards a card.\n−2: Target player sacrifices a creature.\n−6: Separate all permanents target player controls into two piles. That player sacrifices all permanents in the pile of their choice.' },
  { name: 'Lotus Cobra', oracle_text: 'Landfall — Whenever a land you control enters, add one mana of any color.' },
  { name: 'Luminarch Aspirant', oracle_text: 'At the beginning of combat on your turn, put a +1/+1 counter on target creature you control.' },
  { name: 'Lush Portico', oracle_text: '({T}: Add {G} or {W}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Magma Jet', oracle_text: 'Magma Jet deals 2 damage to any target. Scry 2.' },
  { name: 'Meticulous Archive', oracle_text: '({T}: Add {W} or {U}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Mind\'s Desire', oracle_text: 'Shuffle your library. Then exile the top card of your library. Until end of turn, you may play that card without paying its mana cost.\nStorm (When you cast this spell, copy it for each spell cast before it this turn.)' },
  { name: 'Mine Collapse', oracle_text: 'If it\'s your turn, you may sacrifice a Mountain rather than pay this spell\'s mana cost.\nMine Collapse deals 5 damage to target creature or planeswalker.' },
  { name: 'Mishra\'s Bauble', oracle_text: '{T}, Sacrifice this artifact: Look at the top card of target player\'s library. Draw a card at the beginning of the next turn\'s upkeep.' },
  { name: 'Moat', oracle_text: 'Creatures without flying can\'t attack.' },
  { name: 'Mox Diamond', oracle_text: 'If this artifact would enter, you may discard a land card instead. If you do, put this artifact onto the battlefield. If you don\'t, put it into its owner\'s graveyard.\n{T}: Add one mana of any color.' },
  { name: 'Mystical Tutor', oracle_text: 'Search your library for an instant or sorcery card, reveal it, then shuffle and put that card on top.' },
  { name: 'Natural Order', oracle_text: 'As an additional cost to cast this spell, sacrifice a green creature.\nSearch your library for a green creature card, put it onto the battlefield, then shuffle.' },
  { name: 'Night\'s Whisper', oracle_text: 'You draw two cards and lose 2 life.' },
  { name: 'Opposition', oracle_text: 'Tap an untapped creature you control: Tap target artifact, creature, or land.' },
  { name: 'Pack Rat', oracle_text: 'Pack Rat\'s power and toughness are each equal to the number of Rats you control.\n{2}{B}, Discard a card: Create a token that\'s a copy of this creature.' },
  { name: 'Path to Exile', oracle_text: 'Exile target creature. Its controller may search their library for a basic land card, put that card onto the battlefield tapped, then shuffle.' },
  { name: 'Ponder', oracle_text: 'Look at the top three cards of your library, then put them back in any order. You may shuffle.\nDraw a card.' },
  { name: 'Portable Hole', oracle_text: 'When this artifact enters, exile target nonland permanent an opponent controls with mana value 2 or less until this artifact leaves the battlefield.' },
  { name: 'Primeval Titan', oracle_text: 'Trample\nWhenever this creature enters or attacks, you may search your library for up to two land cards, put them onto the battlefield tapped, then shuffle.' },
  { name: 'Pyrokinesis', oracle_text: 'You may exile a red card from your hand rather than pay this spell\'s mana cost.\nPyrokinesis deals 4 damage divided as you choose among any number of target creatures.' },
  { name: 'Raffine\'s Tower', oracle_text: '({T}: Add {W}, {U}, or {B}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Ramunap Excavator', oracle_text: 'You may play lands from your graveyard.' },
  { name: 'Raucous Theater', oracle_text: '({T}: Add {B} or {R}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Raugrin Triome', oracle_text: '({T}: Add {U}, {R}, or {W}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Ravenous Chupacabra', oracle_text: 'When this creature enters, destroy target creature an opponent controls.' },
  { name: 'Regrowth', oracle_text: 'Return target card from your graveyard to your hand.' },
  { name: 'Rofellos, Llanowar Emissary', oracle_text: '{T}: Add {G} for each Forest you control.' },
  { name: 'Ruin Grinder', oracle_text: 'Menace\nWhen this creature dies, each player may discard their hand and draw seven cards.\nMountaincycling {2} ({2}, Discard this card: Search your library for a Mountain card, reveal it, put it into your hand, then shuffle.)' },
  { name: 'Sacred Foundry', oracle_text: '({T}: Add {R} or {W}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Savai Triome', oracle_text: '({T}: Add {R}, {W}, or {B}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Scavenging Ooze', oracle_text: '{G}: Exile target card from a graveyard. If it was a creature card, put a +1/+1 counter on this creature and you gain 1 life.' },
  { name: 'Scrapwork Mutt', oracle_text: 'When this creature enters, you may discard a card. If you do, draw a card.\nUnearth {1}{R} ({1}{R}: Return this card from your graveyard to the battlefield. It gains haste. Exile it at the beginning of the next end step or if it would leave the battlefield. Unearth only as a sorcery.)' },
  { name: 'Shadowy Backstreet', oracle_text: '({T}: Add {W} or {B}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Sheoldred, the Apocalypse', oracle_text: 'Deathtouch\nWhenever you draw a card, you gain 2 life.\nWhenever an opponent draws a card, they lose 2 life.' },
  { name: 'Show and Tell', oracle_text: 'Each player may put an artifact, creature, enchantment, or land card from their hand onto the battlefield.' },
  { name: 'Sneak Attack', oracle_text: '{R}: You may put a creature card from your hand onto the battlefield. That creature gains haste. Sacrifice the creature at the beginning of the next end step.' },
  { name: 'Solemn Simulacrum', oracle_text: 'When this creature enters, you may search your library for a basic land card, put that card onto the battlefield tapped, then shuffle.\nWhen this creature dies, you may draw a card.' },
  { name: 'Spara\'s Headquarters', oracle_text: '({T}: Add {G}, {W}, or {U}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Spellseeker', oracle_text: 'When this creature enters, you may search your library for an instant or sorcery card with mana value 2 or less, reveal it, put it into your hand, then shuffle.' },
  { name: 'Spirit of the Labyrinth', oracle_text: 'Each player can\'t draw more than one card each turn.' },
  { name: 'Splitskin Doll', oracle_text: 'When this creature enters, draw a card. Then discard a card unless you control another creature with power 2 or less.' },
  { name: 'Steam Vents', oracle_text: '({T}: Add {U} or {R}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Stomping Ground', oracle_text: '({T}: Add {R} or {G}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Stormfist Crusader', oracle_text: 'Menace\nAt the beginning of your upkeep, each player draws a card and loses 1 life.' },
  { name: 'Stormscale Scion', oracle_text: 'Flying\nOther Dragons you control get +1/+1.\nStorm (When you cast this spell, copy it for each spell cast before it this turn. Copies become tokens.)' },
  { name: 'Sulfuric Vortex', oracle_text: 'At the beginning of each player\'s upkeep, this enchantment deals 2 damage to that player.\nIf a player would gain life, that player gains no life instead.' },
  { name: 'Survival of the Fittest', oracle_text: '{G}, Discard a creature card: Search your library for a creature card, reveal that card, put it into your hand, then shuffle.' },
  { name: 'Temple Garden', oracle_text: '({T}: Add {G} or {W}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Thalia, Heretic Cathar', oracle_text: 'First strike\nCreatures and nonbasic lands your opponents control enter tapped.' },
  { name: 'Thalia\'s Lieutenant', oracle_text: 'When this creature enters, put a +1/+1 counter on each other Human you control.\nWhenever another Human you control enters, put a +1/+1 counter on this creature.' },
  { name: 'Third Path Iconoclast', oracle_text: 'Whenever you cast a noncreature spell, create a 1/1 colorless Soldier artifact creature token.' },
  { name: 'Thundering Falls', oracle_text: '({T}: Add {U} or {R}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Time Spiral', oracle_text: 'Exile Time Spiral. Each player shuffles their hand and graveyard into their library, then draws seven cards. You untap up to six lands.' },
  { name: 'Timetwister', oracle_text: 'Each player shuffles their hand and graveyard into their library, then draws seven cards. (Then put Timetwister into its owner\'s graveyard.)' },
  { name: 'Titania, Protector of Argoth', oracle_text: 'When Titania enters, return target land card from your graveyard to the battlefield.\nWhenever a land you control is put into a graveyard from the battlefield, create a 5/3 green Elemental creature token.' },
  { name: 'Tolarian Academy', oracle_text: '{T}: Add {U} for each artifact you control.' },
  { name: 'Treachery', oracle_text: 'Enchant creature\nWhen this Aura enters, untap up to five lands.\nYou control enchanted creature.' },
  { name: 'Ulcerate', oracle_text: 'Target creature gets -3/-3 until end of turn. You lose 3 life.' },
  { name: 'Undercity Sewers', oracle_text: '({T}: Add {U} or {B}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Underground Mortuary', oracle_text: '({T}: Add {B} or {G}.)\nThis land enters tapped.\nWhen this land enters, surveil 1. (Look at the top card of your library. You may put it into your graveyard.)' },
  { name: 'Unearth', oracle_text: 'Return target creature card with mana value 3 or less from your graveyard to the battlefield.\nCycling {2} ({2}, Discard this card: Draw a card.)' },
  { name: 'Venser, Shaper Savant', oracle_text: 'Flash (You may cast this spell any time you could cast an instant.)\nWhen Venser enters, return target spell or permanent to its owner\'s hand.' },
  { name: 'Watery Grave', oracle_text: '({T}: Add {U} or {B}.)\nAs this land enters, you may pay 2 life. If you don\'t, it enters tapped.' },
  { name: 'Wheel of Fortune', oracle_text: 'Each player discards their hand, then draws seven cards.' },
  { name: 'Wildfire', oracle_text: 'Each player sacrifices four lands of their choice. Wildfire deals 4 damage to each creature.' },
  { name: 'Woodfall Primus', oracle_text: 'Trample\nWhen this creature enters, destroy target noncreature permanent.\nPersist (When this creature dies, if it had no -1/-1 counters on it, return it to the battlefield under its owner\'s control with a -1/-1 counter on it.)' },
  { name: 'Xander\'s Lounge', oracle_text: '({T}: Add {U}, {B}, or {R}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Zagoth Triome', oracle_text: '({T}: Add {B}, {G}, or {U}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Ziatora\'s Proving Ground', oracle_text: '({T}: Add {B}, {R}, or {G}.)\nThis land enters tapped.\nCycling {3} ({3}, Discard this card: Draw a card.)' },
  { name: 'Zuran Orb', oracle_text: 'Sacrifice a land: You gain 2 life.' },
  // Ambiguous cards — parse but may produce multiple results
  { name: 'Force of Will', oracle_text: 'You may pay 1 life and exile a blue card from your hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Young Pyromancer', oracle_text: 'Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.' },
  { name: 'Daze', oracle_text: 'You may return an Island you control to its owner\'s hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Gush', oracle_text: 'You may return two Islands you control to their owner\'s hand rather than pay this spell\'s mana cost.\nDraw two cards.' },
  { name: 'Tendrils of Agony', oracle_text: 'Target player loses 2 life and you gain 2 life.\nStorm' },
  { name: 'Garruk Wildspeaker', oracle_text: '+1: Untap two target lands.\n−1: Create a 3/3 green Beast creature token.\n−4: Creatures you control get +3/+3 and gain trample until end of turn.' },
  { name: 'Bone Shards', oracle_text: 'As an additional cost to cast this spell, sacrifice a creature or discard a card.\nDestroy target creature or planeswalker.' },
  { name: 'Reclamation Sage', oracle_text: 'When this creature enters, you may destroy target artifact or enchantment.' },
  { name: 'Blade Splicer', oracle_text: 'When this creature enters, create a 3/3 colorless Phyrexian Golem artifact creature token.\nGolems you control have first strike.' },
  { name: 'Thragtusk', oracle_text: 'When this creature enters, you gain 5 life.\nWhen this creature leaves the battlefield, create a 3/3 green Beast creature token.' },
  { name: 'Craterhoof Behemoth', oracle_text: 'Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.' },
  { name: 'Blood Artist', oracle_text: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.' },
  { name: 'Zealous Conscripts', oracle_text: 'Haste\nWhen this creature enters, gain control of target permanent until end of turn. Untap that permanent. It gains haste until end of turn.' },
  { name: 'Vampiric Tutor', oracle_text: 'Search your library for a card, then shuffle and put that card on top. You lose 2 life.' },
  { name: 'Imperial Seal', oracle_text: 'Search your library for a card, then shuffle and put that card on top. You lose 2 life.' },
  { name: 'Enlightened Tutor', oracle_text: 'Search your library for an artifact or enchantment card, reveal it, then shuffle and put that card on top.' },
  { name: 'Green Sun\'s Zenith', oracle_text: 'Search your library for a green creature card with mana value X or less, put it onto the battlefield, then shuffle. Shuffle Green Sun\'s Zenith into its owner\'s library.' },
  { name: 'Stoneforge Mystic', oracle_text: 'When Stoneforge Mystic enters, you may search your library for an Equipment card, reveal it, put it into your hand, then shuffle.\n{1}{W}, {T}: You may put an Equipment card from your hand onto the battlefield.' },
  { name: 'Verdant Catacombs', oracle_text: '{T}, Pay 1 life, Sacrifice Verdant Catacombs: Search your library for a Swamp or Forest card, put it onto the battlefield, then shuffle.' },
  { name: 'Scalding Tarn', oracle_text: '{T}, Pay 1 life, Sacrifice Scalding Tarn: Search your library for an Island or Mountain card, put it onto the battlefield, then shuffle.' },
  { name: 'Polluted Delta', oracle_text: '{T}, Pay 1 life, Sacrifice Polluted Delta: Search your library for an Island or Swamp card, put it onto the battlefield, then shuffle.' },
  { name: 'Flooded Strand', oracle_text: '{T}, Pay 1 life, Sacrifice Flooded Strand: Search your library for a Plains or Island card, put it onto the battlefield, then shuffle.' },
  { name: 'Bloodstained Mire', oracle_text: '{T}, Pay 1 life, Sacrifice Bloodstained Mire: Search your library for a Swamp or Mountain card, put it onto the battlefield, then shuffle.' },
  { name: 'Wooded Foothills', oracle_text: '{T}, Pay 1 life, Sacrifice Wooded Foothills: Search your library for a Mountain or Forest card, put it onto the battlefield, then shuffle.' },
  { name: 'Windswept Heath', oracle_text: '{T}, Pay 1 life, Sacrifice Windswept Heath: Search your library for a Forest or Plains card, put it onto the battlefield, then shuffle.' },
  { name: 'Marsh Flats', oracle_text: '{T}, Pay 1 life, Sacrifice Marsh Flats: Search your library for a Plains or Swamp card, put it onto the battlefield, then shuffle.' },
  { name: 'Arid Mesa', oracle_text: '{T}, Pay 1 life, Sacrifice Arid Mesa: Search your library for a Mountain or Plains card, put it onto the battlefield, then shuffle.' },
  { name: 'Misty Rainforest', oracle_text: '{T}, Pay 1 life, Sacrifice Misty Rainforest: Search your library for a Forest or Island card, put it onto the battlefield, then shuffle.' },
  { name: 'Dack Fayden', oracle_text: '+1: Target player draws two cards, then discards two cards.\n−2: Gain control of target artifact.\n−6: You get an emblem with "Whenever you cast a spell that targets one or more permanents, gain control of those permanents."' },
  { name: 'Feed the Swarm', oracle_text: 'Destroy target creature or enchantment an opponent controls. You lose life equal to that permanent\'s mana value.' },
  { name: 'Library of Alexandria', oracle_text: '{T}: Add {C}.\n{T}: Draw a card. Activate only if you have exactly seven cards in hand.' },
  { name: 'Mox Opal', oracle_text: 'Metalcraft — {T}: Add one mana of any color. Activate only if you control three or more artifacts.' },
  { name: 'Phantasmal Shieldback', oracle_text: 'When this creature becomes the target of a spell or ability, sacrifice it.\nWhen this creature dies, draw a card.' },
  { name: 'Baral, Chief of Compliance', oracle_text: 'Instant and sorcery spells you cast cost {1} less to cast.\nWhenever a spell or ability you control counters a spell, you may draw a card. If you do, discard a card.' },
  { name: 'Windfall', oracle_text: 'Each player discards their hand, then draws cards equal to the greatest number of cards a player discarded this way.' },
  { name: 'Deep-Cavern Bat', oracle_text: 'Flying, lifelink\nWhen this creature enters, look at target opponent\'s hand. You may exile a nonland card from it until this creature leaves the battlefield.' },
  { name: 'Restoration Angel', oracle_text: 'Flash\nFlying\nWhen this creature enters, you may exile target non-Angel creature you control, then return that card to the battlefield under your control.' },
  { name: 'Goblin Guide', oracle_text: 'Haste\nWhenever this creature attacks, defending player reveals the top card of their library. If it\'s a land card, that player puts it into their hand.' },
  { name: 'Loran of the Third Path', oracle_text: 'Vigilance\nWhen Loran enters, destroy up to one target artifact or enchantment.\n{T}: You and target opponent each draw a card.' },
  { name: 'Courser of Kruphix', oracle_text: 'Play with the top card of your library revealed.\nYou may play lands from the top of your library.\nLandfall — Whenever a land you control enters, you gain 1 life.' },
  { name: 'Oracle of Mul Daya', oracle_text: 'You may play an additional land on each of your turns.\nPlay with the top card of your library revealed.\nYou may play lands from the top of your library.' },
  { name: 'Hazoret the Fervent', oracle_text: 'Indestructible, haste\nHazoret can\'t attack or block unless you have one or fewer cards in hand.\n{2}{R}, Discard a card: Hazoret deals 2 damage to each opponent.' },
  { name: 'Narset, Parter of Veils', oracle_text: 'Each opponent can\'t draw more than one card each turn.\n−2: Look at the top four cards of your library. You may reveal a noncreature, nonland card from among them and put it into your hand. Put the rest on the bottom of your library in a random order.' },
  { name: 'Irreverent Gremlin', oracle_text: 'Menace\nWhenever another creature you control with power 2 or less enters, you may discard a card. If you do, draw a card. Do this only once each turn.' },
  { name: 'Oust', oracle_text: 'Put target creature into its owner\'s library second from the top. Its controller gains 3 life.' },
  { name: 'Gravecrawler', oracle_text: 'This creature can\'t block.\nYou may cast this card from your graveyard as long as you control a Zombie.' },
  { name: 'Snapcaster Mage', oracle_text: 'Flash\nWhen this creature enters, target instant or sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost. (You may cast that card from your graveyard for its flashback cost. Then exile it.)' },
  { name: 'Past in Flames', oracle_text: 'Each instant and sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost.\nFlashback {4}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)' },
  { name: 'Yawgmoth\'s Will', oracle_text: 'Until end of turn, you may play lands and cast spells from your graveyard.\nIf a card would be put into your graveyard from anywhere this turn, exile that card instead.' },
  { name: 'Phyrexian Metamorph', oracle_text: '({U/P} can be paid with either {U} or 2 life.)\nYou may have this creature enter as a copy of any artifact or creature on the battlefield, except it\'s an artifact in addition to its other types.' },
  { name: 'Aluren', oracle_text: 'Any player may cast creature spells with mana value 3 or less without paying their mana costs and as though they had flash.' },
  { name: 'Fastbond', oracle_text: 'You may play any number of lands on each of your turns. Whenever you play a land, if it wasn\'t the first land you played this turn, this enchantment deals 1 damage to you.' },
  { name: 'Esper Sentinel', oracle_text: 'Whenever an opponent casts their first noncreature spell each turn, draw a card unless that player pays {X}, where X is this creature\'s power.' },
  { name: 'Land Tax', oracle_text: 'At the beginning of your upkeep, if an opponent controls more lands than you, you may search your library for up to three basic land cards, reveal them, put them into your hand, then shuffle.' },
  { name: 'Sram\'s Expertise', oracle_text: 'Create three 1/1 colorless Servo artifact creature tokens. You may cast a spell with mana value 3 or less from your hand without paying its mana cost.' },
  { name: 'Torsten, Founder of Benalia', oracle_text: 'When Torsten enters, reveal the top seven cards of your library. Put any number of creature and/or land cards from among them into your hand and the rest on the bottom of your library in a random order.\nWhen Torsten dies, create seven 1/1 white Soldier creature tokens.' },
  { name: 'Channel', oracle_text: 'Until end of turn, any time you could activate a mana ability, you may pay 1 life. If you do, add {C}.' },
  { name: 'Memory Jar', oracle_text: '{T}, Sacrifice this artifact: Each player exiles all cards from their hand face down and draws seven cards. At the beginning of the next end step, each player discards their hand and returns to their hand each card they exiled this way.' },
];

// ============================================================================
// Snapshot tests — capture full AST for every card for regression detection.
// ============================================================================

// Build unique test names for cards (handle duplicates with different oracle text)
const cardTestEntries: [string, CubeCard][] = [];
const nameCount = new Map<string, number>();
for (const card of cubeCards) {
  const count = (nameCount.get(card.name) ?? 0) + 1;
  nameCount.set(card.name, count);
  const label = count > 1 ? `${card.name} (${count})` : card.name;
  cardTestEntries.push([label, card]);
}

describe('Unambiguous cards: single parse + snapshot', () => {
  const unambiguous = cardTestEntries.filter(([, c]) => !c.ambiguous && !c.parseError);
  it.each(unambiguous)('%s', (_label, card) => {
    const result = parse(card);
    expect(result.error).toBeNull();
    expect(result.result).not.toBeNull();
    expect(result.result).toHaveLength(1);
    expect(result.result![0]).toMatchSnapshot();
  });
});

describe('Ambiguous cards: parses with snapshot', () => {
  const ambiguous = cardTestEntries.filter(([, c]) => c.ambiguous && !c.parseError);
  if (ambiguous.length === 0) {
    it('no ambiguous cards remaining', () => {
      expect(ambiguous).toHaveLength(0);
    });
  } else {
    it.each(ambiguous)('%s', (_label, card) => {
      const result = parse(card);
      expect(result.result).not.toBeNull();
      expect(result.result!.length).toBeGreaterThanOrEqual(1);
      expect(result.result![0]).toMatchSnapshot();
    });
  }
});

describe('Known parse failures: grammar too complex', () => {
  const parseErrors = cardTestEntries.filter(([, c]) => c.parseError);
  it.each(parseErrors)('%s', (_label, card) => {
    const result = parse(card);
    expect(result.error).not.toBeNull();
  });
});

describe('Misc', () => {
  it('parseCard works without layout field', () => {
    const result = parseCard({ name: 'Lightning Bolt', oracle_text: 'Lightning Bolt deals 3 damage to any target.' });
    expect(result.result).not.toBeNull();
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
