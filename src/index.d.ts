// Type definitions for magic-card-parser
// These types describe the actual output of the Nearley grammar parser.

/** Input to parseCard */
export interface CardInput {
  name: string;
  oracle_text: string;
  layout?: string;
}

/** Result from parseCard */
export interface ParseResult {
  /** Array of possible parses. Each parse is an array of AbilityNodes. null on error. */
  result: AbilityNode[][] | null;
  /** Error message/object, or null on success. "Ambiguous parse" if multiple results. */
  error: string | Error | null;
  /** The oracle text after name substitution and lowercasing */
  oracleText: string;
  /** The original card input */
  card: CardInput;
  /** Alias for result (used in some error paths instead of result) */
  parsed?: AbilityNode[][] | null;
}

/** Result from parseTypeLine */
export interface TypeLineResult {
  result: TypeLineNode[] | null;
  error: string | Error | null;
  typeLine: string;
}

/** A parsed type line node */
export interface TypeLineNode {
  superType?: string;
  type: string | { and: string[] };
  subType?: string | { and: string[] };
}

/** Mana cost value — an array mixing generic amounts and color chars */
export type ManaCostValue = (string | number)[];

/**
 * A node in the parsed ability AST.
 * Keywords are flattened as individual strings in the top-level array.
 */
export type AbilityNode =
  | string
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
  abilityWord?: string;
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
    partOfTurn: string;
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
  | { color: string | string[] }
  | Record<string, unknown>;

/** Condition node */
export type ConditionNode = string | Record<string, unknown>;

/** Duration specification */
export type DurationSpec = string | { until: string | ConditionNode };

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
  | { returns: ObjectSpec; to: string; tapped?: boolean }
  | { search: string | ObjectSpec; criteria?: ObjectSpec }
  | { addOneOf: (string | string[])[]; amount?: number }
  | { amount: number; counterKind: string | PTModification; putOn: ObjectSpec }
  | { cast: ObjectSpec; withoutPaying?: boolean; duration?: DurationSpec }
  | {
      put: ObjectSpec;
      into: string | { secondFromTop: Record<string, unknown> };
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
  | { shuffle: string }
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
  | { skip: string }
  | { choose: string | ObjectSpec }
  | { would: string | Record<string, unknown>; instead?: EffectNode; except?: EffectNode; while?: ConditionNode }
  | { playRevealed: ObjectSpec }
  | { whose: ObjectSpec; activatedAbilities?: EffectNode }
  | { characteristic: string; setTo: Record<string, unknown> }
  | { flashbackCost: Record<string, unknown> }
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
  color?: string;
  abilities?: string[];
  [key: string]: unknown;
}

/** Parse a card's oracle text into an AST */
export function parseCard(card: CardInput): ParseResult;

/** Parse a type line into structured components */
export function parseTypeLine(typeLine: string): TypeLineResult;

/** Generate a GraphViz DOT representation of a card's parse tree */
export function cardToGraphViz(card: CardInput): string | null;
