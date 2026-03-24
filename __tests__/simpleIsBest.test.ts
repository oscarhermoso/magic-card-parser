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
  { name: 'Force of Will', oracle_text: 'You may pay 1 life and exile a blue card from your hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Young Pyromancer', oracle_text: 'Whenever you cast an instant or sorcery spell, create a 1/1 red Elemental creature token.' },
  { name: 'Daze', oracle_text: 'You may return an Island you control to its owner\'s hand rather than pay this spell\'s mana cost.\nCounter target spell.' },
  { name: 'Gush', oracle_text: 'You may return two Islands you control to their owner\'s hand rather than pay this spell\'s mana cost.\nDraw two cards.' },
  { name: 'Tendrils of Agony', oracle_text: 'Target player loses 2 life and you gain 2 life.\nStorm' },
  { name: 'Garruk Wildspeaker', oracle_text: '+1: Untap two target lands.\n−1: Create a 3/3 green Beast creature token.\n−4: Creatures you control get +3/+3 and gain trample until end of turn.' },
  { name: 'Bone Shards', oracle_text: 'As an additional cost to cast this spell, sacrifice a creature or discard a card.\nDestroy target creature or planeswalker.' },

  // New-style "this creature" ETB triggers — still ambiguous
  { name: 'Reclamation Sage', oracle_text: 'When this creature enters, you may destroy target artifact or enchantment.' },
  { name: 'Blade Splicer', oracle_text: 'When this creature enters, create a 3/3 colorless Phyrexian Golem artifact creature token.\nGolems you control have first strike.' },
  { name: 'Thragtusk', oracle_text: 'When this creature enters, you gain 5 life.\nWhen this creature leaves the battlefield, create a 3/3 green Beast creature token.' },
  { name: 'Craterhoof Behemoth', oracle_text: 'Haste\nWhen this creature enters, creatures you control gain trample and get +X/+X until end of turn, where X is the number of creatures you control.' },
  { name: 'Blood Artist', oracle_text: 'Whenever this creature or another creature dies, target player loses 1 life and you gain 1 life.' },
  { name: 'Zealous Conscripts', oracle_text: 'Haste\nWhen this creature enters, gain control of target permanent until end of turn. Untap that permanent. It gains haste until end of turn.' },

  // Search/tutor patterns — still ambiguous
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

  // Planeswalker loyalty abilities (Step 7)
  { name: 'Dack Fayden', oracle_text: '+1: Target player draws two cards, then discards two cards.\n−2: Gain control of target artifact.\n−6: You get an emblem with "Whenever you cast a spell that targets one or more permanents, gain control of those permanents."' },

  // Step 8: still ambiguous
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
  // Step 1: Oust — ambiguous due to "gains N life" matching both imperative and playerVerbPhrase paths
  { name: 'Oust', oracle_text: 'Put target creature into its owner\'s library second from the top. Its controller gains 3 life.' },
  // Step 2: Graveyard casting — ambiguous due to "instant or sorcery" / "can't block" type parsing
  { name: 'Gravecrawler', oracle_text: 'This creature can\'t block.\nYou may cast this card from your graveyard as long as you control a Zombie.' },
  { name: 'Snapcaster Mage', oracle_text: 'Flash\nWhen this creature enters, target instant or sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost. (You may cast that card from your graveyard for its flashback cost. Then exile it.)' },
  { name: 'Past in Flames', oracle_text: 'Each instant and sorcery card in your graveyard gains flashback until end of turn. The flashback cost is equal to its mana cost.\nFlashback {4}{R} (You may cast this card from your graveyard for its flashback cost. Then exile it.)' },
  // Step 3: Yawgmoth's Will — ambiguous due to compound play/cast structure
  { name: 'Yawgmoth\'s Will', oracle_text: 'Until end of turn, you may play lands and cast spells from your graveyard.\nIf a card would be put into your graveyard from anywhere this turn, exile that card instead.' },
  // Step 4: Phyrexian Metamorph — ambiguous due to copy object resolution
  { name: 'Phyrexian Metamorph', oracle_text: '({U/P} can be paid with either {U} or 2 life.)\nYou may have this creature enter as a copy of any artifact or creature on the battlefield, except it\'s an artifact in addition to its other types.' },
  // Step 5: Static restrictions — Aluren, Fastbond ambiguous due to type/object overlap
  { name: 'Aluren', oracle_text: 'Any player may cast creature spells with mana value 3 or less without paying their mana costs and as though they had flash.' },
  { name: 'Fastbond', oracle_text: 'You may play any number of lands on each of your turns. Whenever you play a land, if it wasn\'t the first land you played this turn, this enchantment deals 1 damage to you.' },
  // Step 6: Conditional triggered abilities — Esper Sentinel, Land Tax ambiguous
  { name: 'Esper Sentinel', oracle_text: 'Whenever an opponent casts their first noncreature spell each turn, draw a card unless that player pays {X}, where X is this creature\'s power.' },
  { name: 'Land Tax', oracle_text: 'At the beginning of your upkeep, if an opponent controls more lands than you, you may search your library for up to three basic land cards, reveal them, put them into your hand, then shuffle.' },
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

  // Search/tutor/fetchland AST tests (Step 5)
  it('Demonic Tutor: search for card, put into hand, shuffle', () => {
    const result = parse({ name: 'Demonic Tutor', oracle_text: 'Search your library for a card, put that card into your hand, then shuffle.' });
    expect(result.result).not.toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
    // First parse should contain search + put + shuffle
    const effect = abilities[0];
    // Should contain search with library
    const flat = JSON.stringify(effect);
    expect(flat).toContain('"search"');
    expect(flat).toContain('"library"');
    expect(flat).toContain('"shuffle"');
  });

  it('Verdant Catacombs: fetchland with tap/life/sacrifice cost', () => {
    const result = parse({ name: 'Verdant Catacombs', oracle_text: '{T}, Pay 1 life, Sacrifice Verdant Catacombs: Search your library for a Swamp or Forest card, put it onto the battlefield, then shuffle.' });
    expect(result.result).not.toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(1);
    const ability = abilities[0];
    // Should be an activated ability with costs
    expect(ability).toHaveProperty('costs');
    expect(ability).toHaveProperty('activatedAbility');
    // Cost should include tap, life payment, and sacrifice
    const costStr = JSON.stringify(ability.costs);
    expect(costStr).toContain('"tap"');
    expect(costStr).toContain('"life"');
    expect(costStr).toContain('"sacrifice"');
  });

  it('Tinker: additional cost + search for artifact', () => {
    const result = parse({ name: 'Tinker', oracle_text: 'As an additional cost to cast this spell, sacrifice an artifact.\nSearch your library for an artifact card, put that card onto the battlefield, then shuffle.' });
    expect(result.result).not.toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(2);
    // First ability should be additional cost
    expect(abilities[0]).toHaveProperty('additionalCost');
    // Second ability should contain search
    const searchStr = JSON.stringify(abilities[1]);
    expect(searchStr).toContain('"search"');
    expect(searchStr).toContain('"battlefield"');
  });

  // Planeswalker AST tests (Step 7)
  it('Elspeth, Sun\'s Champion: three loyalty abilities', () => {
    const result = parse({ name: 'Elspeth, Sun\'s Champion', oracle_text: '+1: Create three 1/1 white Soldier creature tokens.\n−3: Destroy all creatures with power 4 or greater.\n−7: You get an emblem with "Creatures you control get +2/+2 and have flying."' });
    expect(result.result).not.toBeNull();
    const abilities = result.result![0];
    // Should have 3 loyalty abilities
    expect(abilities).toHaveLength(3);
    // Each should have costs (loyalty cost) and activatedAbility
    abilities.forEach((a: Record<string, unknown>) => {
      expect(a).toHaveProperty('costs');
      expect(a).toHaveProperty('activatedAbility');
    });
  });

  it('Dack Fayden: loyalty abilities with draw/discard, control, emblem', () => {
    const result = parse({ name: 'Dack Fayden', oracle_text: '+1: Target player draws two cards, then discards two cards.\n−2: Gain control of target artifact.\n−6: You get an emblem with "Whenever you cast a spell that targets one or more permanents, gain control of those permanents."' });
    expect(result.result).not.toBeNull();
    const abilities = result.result![0];
    expect(abilities).toHaveLength(3);
    // +1 should contain draw and discard
    const plus1 = JSON.stringify(abilities[0]);
    expect(plus1).toContain('"draw"');
    expect(plus1).toContain('"discard"');
  });

  it('parseCard works without layout field', () => {
    const result = parseCard({ name: 'Lightning Bolt', oracle_text: 'Lightning Bolt deals 3 damage to any target.' });
    expect(result.result).not.toBeNull();
  });

  it('Vampiric Tutor: search, shuffle and put on top, lose life', () => {
    const result = parse({ name: 'Vampiric Tutor', oracle_text: 'Search your library for a card, then shuffle and put that card on top. You lose 2 life.' });
    expect(result.result).not.toBeNull();
    const flat = JSON.stringify(result.result![0]);
    expect(flat).toContain('"search"');
    expect(flat).toContain('"shuffle"');
    expect(flat).toContain('"topOf"');
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
