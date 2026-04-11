// Type definitions for magic-card-parser
// These types describe the actual output of the Nearley grammar parser.

/** Typed card layout values (Scryfall layout field) */
export type CardLayout =
  | 'normal'
  | 'adventure'
  | 'transform'
  | 'modal_dfc'
  | 'split'
  | 'flip'
  | 'leveler'
  | 'meld';

// ─── Game Zone Enums ───────────────────────────────────────────────────────────

/** Zones that can be owned by a player (have possessive: "your graveyard") */
export type OwnedZone = 'graveyard' | 'library' | 'hand';

/** All game zones the parser emits as string values */
export type Zone = OwnedZone | 'battlefield' | 'exile' | 'anywhere' | 'stack' | 'command';

// ─── Turn Phase / Step Enums ───────────────────────────────────────────────────

/** Turn phases and steps — camelCase values emitted by partOfTurn grammar rule */
export type TurnPhase =
  | 'turn'
  | 'untap'
  | 'upkeep'
  | 'drawStep'
  | 'precombatMain'
  | 'main'
  | 'combat'
  | 'declareAttackers'
  | 'declareBlockers'
  | 'combatDamage'
  | 'endCombat'
  | 'postcombatMain'
  | 'end';

// ─── Color Enums ───────────────────────────────────────────────────────────────

/** Single-letter mana/color abbreviations (WUBRG + colorless) */
export type Color = 'w' | 'u' | 'b' | 'r' | 'g';

/** Extended color identity including colorless */
export type ColorIdentity = Color | 'colorless';

/** Color filter values the grammar emits — includes mono/multi for "monocolored"/"multicolored" */
export type ColorFilter = ColorIdentity | 'mono' | 'multi';

/** Mana symbol letters: colors + colorless + generic/special */
export type ManaLetter = Color | 'c' | 'x' | 'y' | 'z' | 'p' | 's' | number;

// ─── Counter Enums ─────────────────────────────────────────────────────────────

/** Named counter kinds recognized by the grammar (from COUNTER_KINDS Set) */
export type CounterKind =
  | 'acorn' | 'age' | 'aim' | 'arrow' | 'arrowhead' | 'awakening'
  | 'blaze' | 'blood' | 'bounty' | 'bribery' | 'brick'
  | 'cage' | 'carrion' | 'charge' | 'coin' | 'credit' | 'corpse' | 'crystal' | 'cube' | 'currency'
  | 'death' | 'deathtouch' | 'delay' | 'depletion' | 'despair' | 'devotion' | 'divinity' | 'doom' | 'dream'
  | 'echo' | 'egg' | 'elixir' | 'energy' | 'eon' | 'experience' | 'eyeball' | 'eyestalk'
  | 'fade' | 'fate' | 'feather' | 'fetch' | 'filibuster' | 'flood' | 'flying' | 'fungus' | 'fuse'
  | 'gem' | 'glyph' | 'gold' | 'growth'
  | 'hatchling' | 'healing' | 'hexproof' | 'hit' | 'hoofprint' | 'hour'
  | 'ice' | 'indestructible' | 'infection' | 'intervention' | 'isolation'
  | 'javelin'
  | 'ki' | 'knowledge'
  | 'level' | 'lifelink' | 'lore' | 'loyalty' | 'luck'
  | 'magnet' | 'manabond' | 'manifestation' | 'mannequin' | 'mask' | 'matrix' | 'menace' | 'mine' | 'mining' | 'mire' | 'music' | 'muster'
  | 'net'
  | 'omen' | 'ore'
  | 'page' | 'pain' | 'paralyzation' | 'petal' | 'petrification' | 'phylactery' | 'pin' | 'plague' | 'poison' | 'polyp' | 'pressure' | 'prey' | 'pupa'
  | 'quest'
  | 'reach' | 'rust'
  | 'scream' | 'shell' | 'shield' | 'silver' | 'shred' | 'sleep' | 'sleight' | 'slime' | 'slumber' | 'soot' | 'soul' | 'spark' | 'spore' | 'storage' | 'strife' | 'study'
  | 'task' | 'theft' | 'tide' | 'time' | 'tower' | 'training' | 'trample' | 'trap' | 'treasure'
  | 'velocity' | 'verse' | 'vigilance' | 'vitality' | 'volatile'
  | 'wage' | 'winch' | 'wind' | 'wish';

/** Counter specification: a named counter kind, a P/T modification (+1/+1, -1/-1), or "double strike"/"first strike" */
export type CounterSpec = CounterKind | PTModification | 'double strike' | 'first strike';

// ─── Card Type Enums ───────────────────────────────────────────────────────────

/** Supertypes */
export type SuperType = 'basic' | 'legendary' | 'snow' | 'ongoing' | 'world';

/** Permanent card types */
export type PermanentType = 'artifact' | 'creature' | 'enchantment' | 'land' | 'planeswalker' | 'permanent';

/** Non-permanent spell types */
export type SpellType = 'instant' | 'sorcery';

/** All card types the grammar recognizes */
export type CardType = PermanentType | SpellType | 'tribal' | 'conspiracy' | 'plane' | 'phenomena' | 'emblem';

/** Basic land types */
export type BasicLandType = 'plains' | 'island' | 'swamp' | 'mountain' | 'forest';

/** All land subtypes */
export type LandType = BasicLandType | 'desert' | 'gate' | 'lair' | 'locus' | 'mine' | 'power-plant' | 'tower' | "urza's";

/** Artifact subtypes */
export type ArtifactType = 'clue' | 'contraption' | 'equipment' | 'food' | 'fortification' | 'gold' | 'treasure' | 'vehicle';

/** Union of all subtypes the grammar can emit */
export type SubType = string; // CreatureType | PlaneswalkerType | LandType | ArtifactType — string for extensibility

// ─── Keyword Enums ─────────────────────────────────────────────────────────────

/** Evergreen and deciduous keywords that take no additional value */
export type SimpleKeyword =
  | 'deathtouch' | 'defender' | 'flash' | 'flying' | 'haste' | 'hexproof'
  | 'indestructible' | 'intimidate' | 'lifelink' | 'reach' | 'shroud'
  | 'trample' | 'vigilance' | 'flanking' | 'phasing' | 'shadow'
  | 'horsemanship' | 'fear' | 'provoke' | 'storm' | 'sunburst' | 'epic'
  | 'convoke' | 'haunt' | 'delve' | 'gravestorm' | 'changeling'
  | 'conspire' | 'persist' | 'wither' | 'retrace' | 'exalted' | 'cascade'
  | 'rebound' | 'infect' | 'undying' | 'soulbond' | 'unleash' | 'cipher'
  | 'evolve' | 'extort' | 'fuse' | 'dethrone' | 'prowess' | 'exploit'
  | 'menace' | 'devoid' | 'ingest' | 'myriad' | 'skulk' | 'melee'
  | 'undaunted' | 'improvise' | 'aftermath' | 'ascend' | 'assist'
  | 'mentor' | 'riot' | 'partner';

/** Keywords that take a mana cost as parameter */
export type CostKeyword =
  | 'equip' | 'escape' | 'spectacle' | 'eternalize' | 'embalm' | 'escalate'
  | 'emerge' | 'surge' | 'awaken' | 'dash' | 'outlast' | 'mutate' | 'bestow'
  | 'scavenge' | 'overload' | 'buyback' | 'echo' | 'flashback' | 'madness'
  | 'morph' | 'entwine' | 'ninjutsu' | 'transmute' | 'replicate' | 'recover'
  | 'fortify' | 'evoke' | 'unearth' | 'miracle' | 'megamorph' | 'prowl'
  | 'transfigure' | 'multikicker'
  | 'disguise' | 'plot' | 'squad' | 'reconfigure' | 'level up';

/** Keywords that take a numeric value as parameter */
export type NumberKeyword =
  | 'afterlife' | 'afflict' | 'fabricate' | 'crew' | 'renown' | 'tribute'
  | 'rampage' | 'fading' | 'amplify' | 'modular' | 'bushido' | 'dredge'
  | 'graft' | 'ripple' | 'vanishing' | 'absorb' | 'poisonous' | 'devour'
  | 'annihilator' | 'frenzy' | 'soulshift' | 'hideaway';

/** Keywords expressed as an explicit literal (multi-word or punctuated) */
export type LiteralKeyword = 'for mirrodin!';

/** All keyword types */
export type Keyword = SimpleKeyword | CostKeyword | NumberKeyword | LiteralKeyword;

// ─── Ability Word Enums ────────────────────────────────────────────────────────

/** Ability words (italicized in card text, no rules meaning) */
export type AbilityWord =
  | 'adamant' | 'addendum' | 'battalion' | 'bloodrush' | 'channel' | 'chroma'
  | 'cohort' | 'constellation' | 'converge' | 'coven' | 'delirium' | 'domain'
  | 'eminence' | 'enrage' | 'exhaust' | 'ferocious' | 'formidable' | 'grandeur'
  | 'hellbent' | 'heroic' | 'imprint' | 'inspired' | 'kinship' | 'landfall'
  | 'lieutenant' | 'metalcraft' | 'morbid' | 'parley' | 'radiance' | 'raid'
  | 'rally' | 'revolt' | 'strive' | 'sweep' | 'temptingoffer' | 'threshold'
  | 'undergrowth'
  | "council's dilemma" | 'fateful hour' | 'join forces' | 'spell mastery' | 'will of the council';

// ─── Numerical Characteristics ─────────────────────────────────────────────────

/** Numerical characteristics that can be compared or modified */
export type NumericalCharacteristic = 'toughness' | 'power' | 'convertedManaCost' | 'manaValue' | 'lifeTotal';

/** A single face of a multi-face card (follows Scryfall card_faces structure) */
export interface CardFace {
  name: string;
  oracle_text: string;
  type_line?: string;
}

/** Input to parseCard / parseFaces */
export interface CardInput {
  name: string;
  oracle_text: string;
  layout?: CardLayout;
  /** Scryfall-style card_faces array — used by parseFaces() for multi-face cards */
  card_faces?: CardFace[];
}

/** Result from parseCard (v1.0) */
export interface ParseResult {
  /** The definitive parse result. null on error. */
  abilities: AbilityNode[] | null;
  /** Fraction of oracle text clauses successfully parsed (0–1). */
  confidence: number;
  /** Clauses the grammar could not parse. */
  unknownClauses: string[];
  /** The oracle text after name substitution and lowercasing */
  oracleText: string;
  /** Error message, or undefined on success. */
  error?: string;
}

/** Result from parseTypeLine */
export interface TypeLineResult {
  result: TypeLineNode[] | null;
  error: string | Error | null;
  typeLine: string;
}

/** A parsed type line node */
export interface TypeLineNode {
  superType?: SuperType | string;
  type: CardType | string | { and: (CardType | string)[] };
  subType?: SubType | string | { and: (SubType | string)[] };
}

/** Mana cost value — an array mixing generic amounts and color chars */
export type ManaCostValue = (ManaLetter | string | number)[];

/**
 * A node in the parsed ability AST.
 * Keywords are flattened as individual strings in the top-level array.
 * `{ unknown: string }` is emitted for clauses the grammar could not parse.
 */
export type AbilityNode =
  | string
  | { unknown: string }
  | KeywordObject
  | ActivatedAbilityNode
  | TriggeredAbilityNode
  | ModalNode
  | AdditionalCostNode
  | EffectNode;

/** Keyword with a cost or value, e.g. { flashback: { mana: [1, "r"] } } */
export type KeywordObject = {
  [keyword: string]: string | number | { mana: ManaCostValue };
};

/** An activated ability with costs and effect */
export interface ActivatedAbilityNode {
  costs: CostSpec;
  activatedAbility: EffectNode | EffectNode[];
  instructions?: Record<string, unknown>;
  abilityWord?: AbilityWord;
}

/** A triggered ability with trigger condition and effect */
export interface TriggeredAbilityNode {
  trigger: TriggerSpec;
  effect: EffectNode;
}

/** A modal spell/ability with choices */
export interface ModalNode {
  quantifier: number[] | string;
  options: EffectNode[];
}

/** An additional cost declaration (e.g. "as an additional cost, sacrifice a creature") */
export interface AdditionalCostNode {
  additionalCost: EffectNode;
}

/** Cost specification - can be a string or structured */
export type CostSpec =
  | string
  | string[]
  | { and: CostSpec[] }
  | { tap: boolean }
  | { mana: ManaCostValue }
  | { life: number }
  | { loyalty: number }
  | { sacrifice: ObjectSpec | string }
  | { discard: ObjectSpec | string }
  | Record<string, unknown>;

/** Trigger specification */
export interface TriggerSpec {
  when?: {
    what?: string | ObjectSpec;
    does?: string | Record<string, unknown>;
    [key: string]: unknown;
  };
  whenever?: {
    what?: string | ObjectSpec;
    does?: string | Record<string, unknown>;
    [key: string]: unknown;
  };
  at?: string | Record<string, unknown>;
  turnPhase?: {
    qualification?: string;
    partOfTurn: TurnPhase;
  };
  [key: string]: unknown;
}

/** Object reference in the AST */
export type ObjectSpec =
  | string
  | {
      reference?: string | { targetCount: number } | { count: number };
      object?: string | { type: TypeFilter; prefixes?: ObjectFilter[] };
      type?: string | TypeFilter;
      prefixes?: ObjectFilter[];
      suffix?: ObjectFilter[];
      [key: string]: unknown;
    };

/** Type filter — single types are plain strings, multi-types use and/or */
export type TypeFilter = string | { and: string[] } | { or: string[] };

/** Object filter used in prefixes/suffixes */
export type ObjectFilter =
  | { not: Record<string, unknown> }
  | { color: ColorFilter | ColorFilter[] }
  | Record<string, unknown>;

/** Condition node */
export type ConditionNode = string | Record<string, unknown>;

/** Duration specification */
export type DurationSpec = 'endOfTurn' | 'yourNextTurn' | string | { until: string | ConditionNode };

/**
 * Effect node - the most varied AST shape.
 * Effects can be simple objects, compound objects, or arrays of effects.
 */
export type EffectNode =
  | { draw: number | ObjectSpec }
  | { destroy: ObjectSpec }
  | { exile: ObjectSpec; faceDown?: boolean; until?: ConditionNode }
  | { sacrifice: ObjectSpec }
  | { discard: ObjectSpec; random?: boolean }
  | { create: TokenSpec }
  | { counter: ObjectSpec }
  | { loseLife: number }
  | { gainLife: number }
  | { lifeGain: { whose?: ObjectSpec; value?: string | number } }
  | { mill: number }
  | { scry: number }
  | { surveil: number }
  | { tap: ObjectSpec }
  | { untap: ObjectSpec }
  | { returns: ObjectSpec; to: Zone | string; tapped?: boolean }
  | { search: Zone | string | ObjectSpec; criteria?: ObjectSpec }
  | { addOneOf: (string | string[])[]; amount?: number }
  | { amount: number; counterKind: CounterSpec; putOn: ObjectSpec }
  | { cast: ObjectSpec; withoutPaying?: boolean; duration?: DurationSpec }
  | {
      put: ObjectSpec;
      into: Zone | string | { secondFromTop: Record<string, unknown> };
      tapped?: boolean;
      control?: string;
    }
  | { may: EffectNode }
  | { and: EffectNode[] }
  | { or: EffectNode[] }
  | { what: string | ObjectSpec; does: VerbPhrase }
  | { actor: string | ObjectSpec; does: VerbPhrase }
  | { deal: DamageSpec }
  | { gainControlOf: ObjectSpec; until?: ConditionNode }
  | { powerToughnessMod: { powerMod?: number; toughnessMod?: number } }
  | { costIncrease: { mana: ManaCostValue }; action?: string }
  | { costDecrease: { mana: ManaCostValue }; action?: string }
  | { haveAbility: string | EffectNode }
  | { emblem: { with: { ability: EffectNode } } }
  | { condition: ConditionNode; effect: EffectNode }
  | { does: EffectNode; unless?: EffectNode; forEach?: ObjectSpec }
  | { asLongAs: ConditionNode; effect: EffectNode }
  | { duration: DurationSpec; effect: EffectNode }
  | { add: string[]; instead?: EffectNode }
  | { enchant: ObjectSpec | { condition: Record<string, unknown> } }
  | { attach: string; to: string }
  | { shuffle: Zone | string }
  | { reveal: ObjectSpec; from?: ObjectSpec }
  | { lookAt: ObjectSpec }
  | { separate: ObjectSpec; into: Record<string, unknown> }
  | { putBack: boolean; anyOrder?: boolean }
  | { gains: string | EffectNode[] }
  | { loses: string | EffectNode[] }
  | { cant: string | Record<string, unknown> }
  | { prevent: Record<string, unknown> }
  | { ratherThan: Record<string, unknown> }
  | { xor: EffectNode[] }
  | { addCombinationOf: string[]; amount?: number }
  | { protectionFrom: ObjectSpec }
  | { each: ObjectSpec; is: string | ObjectSpec }
  | { skip: TurnPhase | string }
  | { choose: string | ObjectSpec }
  | { would: string | Record<string, unknown>; instead?: EffectNode; except?: EffectNode; while?: ConditionNode }
  | { playRevealed: ObjectSpec }
  | { whose: ObjectSpec; activatedAbilities?: EffectNode }
  | { characteristic: NumericalCharacteristic | string; setTo: Record<string, unknown> }
  | { flashbackCost: Record<string, unknown> }
  // New EffectNode variants for sim mechanics with no prior grammar equivalent.
  // Forward declarations: the grammar does not emit these shapes directly yet.
  // Sim uses CARD_MECHANIC_OVERRIDES to inject these nodes until grammar rules are added (hq-5gc).
  | { castFrom: { zone: Zone; criteria?: ObjectSpec; restriction?: 'asThoughFlash' } }
  | { playFrom: { zone: Zone; restriction?: string } }
  | { replaces: { event: 'ETB' | 'die' | 'draw' | 'damage'; with: EffectNode; condition?: ObjectSpec } }
  | { grants: ({ keyword: Keyword | string } | { effect: EffectNode }); to: ObjectSpec; duration?: DurationSpec }
  | { restricts: { cant: string; who: ObjectSpec | 'opponents' } }
  | { costMod: { amount: number | 'X'; filter: ObjectSpec; direction: 'more' | 'less' } }
  | { addType: { type: string; to: ObjectSpec } }
  | EffectNode[]
  | Record<string, unknown>;

/** P/T modification, used for +1/+1 and -1/-1 counters */
export interface PTModification {
  powerMod: number;
  toughnessMod: number;
}

/** Damage specification */
export interface DamageSpec {
  amount: number;
  damageTo: string | ObjectSpec;
}

/** Verb phrase in "X does Y" patterns */
export type VerbPhrase = Record<string, unknown>;

/** Token specification */
export interface TokenSpec {
  amount?: number;
  type?: string;
  power?: number;
  toughness?: number;
  color?: ColorFilter | ColorFilter[];
  abilities?: (Keyword | string)[];
  [key: string]: unknown;
}

/**
 * Result from parseFaces() — one ParseResult per card face.
 * Each face is identified by its name and parsed independently.
 */
export interface MultiParseResult {
  faces: Array<{ faceName: string; result: ParseResult }>;
  /** The layout type of the card (from CardInput.layout or inferred) */
  layout: CardLayout | string;
}

/** @deprecated Use MultiParseResult */
export type FaceParseResult = MultiParseResult;

/** Parse a card's oracle text into an AST */
export function parseCard(card: CardInput): ParseResult;

/**
 * Parse a multi-face card (adventure, transform, DFC, split, etc.).
 * Returns a ParseResult for each face independently.
 *
 * Face detection priority:
 *  1. card.card_faces[] (Scryfall card_faces structure) — preferred
 *  2. '\n//\n' separator in oracle_text (raw Scryfall split oracle text)
 *  3. Fallback: treated as single face, equivalent to parseCard()
 */
export function parseFaces(card: CardInput): MultiParseResult;

/**
 * Convenience function for adventure-layout cards.
 * Parses the creature face and adventure spell face independently.
 */
export function parseAdventure(
  creatureFace: CardFace,
  adventureFace: CardFace,
): { creature: ParseResult; adventure: ParseResult };

/** Parse a type line into structured components */
export function parseTypeLine(typeLine: string): TypeLineResult;

/** Generate a GraphViz DOT representation of a card's parse tree */
export function cardToGraphViz(card: CardInput): string | null;
