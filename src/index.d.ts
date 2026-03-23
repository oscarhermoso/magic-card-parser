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
  /** Alias for result (used in some error paths) */
  parsed?: AbilityNode[][] | null;
}

/** Result from parseTypeLine */
export interface TypeLineResult {
  result: TypeLineNode[][] | null;
  error: string | Error | null;
  typeLine: string;
}

/** A parsed type line node */
export interface TypeLineNode {
  superTypes?: string[];
  type: string;
  subTypes?: string[];
}

/**
 * A node in the parsed ability AST.
 * Can be a keyword string, an array of keywords, or a structured object.
 */
export type AbilityNode =
  | string
  | string[]
  | KeywordObject
  | ActivatedAbilityNode
  | TriggeredAbilityNode
  | ModalNode
  | EffectNode;

/** Keyword with a cost or value, e.g. { cycling: "{2}" } or { flashback: "{1}{R}" } */
export type KeywordObject = { [keyword: string]: string | number };

/** An activated ability with costs and effect */
export interface ActivatedAbilityNode {
  costs: CostSpec;
  activatedAbility: EffectNode;
  instructions?: Record<string, unknown>;
}

/** A triggered ability with trigger condition and effect */
export interface TriggeredAbilityNode {
  trigger: TriggerSpec;
  effect: EffectNode;
  ifClause?: ConditionNode;
}

/** A modal spell/ability with choices */
export interface ModalNode {
  quantifier: number[] | string;
  options: EffectNode[];
}

/** Cost specification - can be a string or structured */
export type CostSpec =
  | string
  | string[]
  | { and: CostSpec[] }
  | { tap: boolean }
  | { mana: string }
  | { life: number }
  | { sacrifice: ObjectSpec }
  | { discard: ObjectSpec }
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
  [key: string]: unknown;
}

/** Object reference in the AST */
export type ObjectSpec =
  | string
  | {
      reference?: string;
      object?: string;
      type?: string;
      [key: string]: unknown;
    };

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
  | { mill: number }
  | { scry: number }
  | { surveil: number }
  | { tap: ObjectSpec }
  | { untap: ObjectSpec }
  | { returns: ObjectSpec; to: string; tapped?: boolean }
  | { search: string | ObjectSpec; criteria?: ObjectSpec }
  | { addOneOf: string[]; amount?: number }
  | { amount: number; counterKind: string; putOn: ObjectSpec }
  | { cast: ObjectSpec; withoutPaying?: boolean }
  | { put: ObjectSpec; into: string; tapped?: boolean }
  | { may: EffectNode; ifDo?: EffectNode }
  | { and: EffectNode[] }
  | { what: string | ObjectSpec; does: VerbPhrase }
  | { actor: string | ObjectSpec; does: VerbPhrase }
  | { deal: DamageSpec }
  | { gainsControlOf: ObjectSpec; until?: ConditionNode }
  | EffectNode[]
  | Record<string, unknown>;

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
