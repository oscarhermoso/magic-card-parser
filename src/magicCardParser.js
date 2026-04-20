import nearley from 'nearley';
const { Parser, Grammar } = nearley;

import magicCardGrammar from './generated/magicCardGrammar.cjs';
import typeLineGrammar from './generated/typeLineGrammar.cjs';
import { replaceCardName } from './nameReplacement.js';

/** @typedef {import('./index.d.ts').CardInput} CardInput */
/** @typedef {import('./index.d.ts').CardFace} CardFace */
/** @typedef {import('./index.d.ts').ParseResult} ParseResult */
/** @typedef {import('./index.d.ts').MultiParseResult} MultiParseResult */
/** @typedef {import('./index.d.ts').TypeLineResult} TypeLineResult */
/** @typedef {import('./index.d.ts').ParsedCard} ParsedCard */
/** @typedef {import('./index.d.ts').ParsedCardFace} ParsedCardFace */
/** @typedef {import('./index.d.ts').ParsedAbility} ParsedAbility */
/** @typedef {import('./index.d.ts').ParsedKeyword} ParsedKeyword */
/** @typedef {import('./index.d.ts').ParsedTypeLine} ParsedTypeLine */
/** @typedef {import('./index.d.ts').ManaCost} ManaCost */
/** @typedef {import('./index.d.ts').ManaSymbol} ManaSymbol */
/** @typedef {import('./index.d.ts').PowerToughness} PowerToughness */

/**
 * @template T
 * @param {T[]} lst
 * @returns {T[]}
 */
const makeUnique = (lst) => {
  /** @type {string[]} */
  const seen = [];
  const result = [];
  for (const elem of lst) {
    const stringified = JSON.stringify(elem);
    if (!seen.includes(stringified)) {
      result.push(elem);
      seen.push(stringified);
    }
  }
  return result;
};

// @ts-ignore — nearley's CompiledRules type doesn't accommodate tuple-destructuring postprocessors
const compiledMagicCardGrammar = Grammar.fromCompiled(magicCardGrammar);
// @ts-ignore — nearley's CompiledRules type doesn't accommodate tuple-destructuring postprocessors
const compiledTypeLineGrammar = Grammar.fromCompiled(typeLineGrammar);

/**
 * Try to parse a single text as a full card via the grammar.
 * Returns the first (best) unique parse result, or null on failure.
 * @param {string} text
 * @returns {{ result: any[] | null, error: string | null }}
 */
const tryParse = (text) => {
  const parser = new Parser(compiledMagicCardGrammar);
  try {
    parser.feed(text);
  } catch (e) {
    return { result: null, error: e instanceof Error ? e.message : String(e) };
  }
  const results = makeUnique(parser.results);
  if (results.length === 0) return { result: null, error: 'Incomplete parse' };
  return { result: results[0], error: null };
};

/**
 * @param {CardInput} card
 * @returns {ParseResult}
 */
const parseCard = (card) => {
  const { name, oracle_text } = card;
  const oracleText = replaceCardName(oracle_text, name);

  // Attempt 1: parse the full oracle text
  const { result: fullResult, error: fullError } = tryParse(oracleText);
  if (fullResult) {
    return { abilities: fullResult, confidence: 1, unknownClauses: [], oracleText };
  }

  // Attempt 2: parse clause-by-clause (split on newlines)
  const lines = oracleText.split('\n').filter((l) => l.trim() !== '');
  if (lines.length <= 1) {
    // Single clause failed — return error as before
    return { abilities: null, confidence: 0, unknownClauses: lines, error: fullError ?? 'Incomplete parse', oracleText };
  }

  /** @type {any[]} */
  const abilities = [];
  /** @type {string[]} */
  const unknownClauses = [];
  let successCount = 0;

  for (const line of lines) {
    const { result: lineResult } = tryParse(line);
    if (lineResult) {
      // Spread the parse result's abilities into the result
      abilities.push(...(Array.isArray(lineResult) ? lineResult : [lineResult]));
      successCount++;
    } else {
      unknownClauses.push(line);
      abilities.push({ unknown: line });
    }
  }

  const confidence = successCount / lines.length;

  if (successCount === 0) {
    return { abilities: null, confidence: 0, unknownClauses, error: fullError ?? 'Incomplete parse', oracleText };
  }

  return { abilities, confidence, unknownClauses, oracleText };
};

/**
 * @param {string} typeLine
 * @returns {TypeLineResult}
 */
const parseTypeLine = (typeLine) => {
  const typeLineParser = new Parser(compiledTypeLineGrammar);
  const normalized = typeLine
    .toLowerCase()
    .replace(/\u2019/g, "'")
    .replace(/\u2014/g, '--')
    .replace(/\u2212/g, '-');
  try {
    typeLineParser.feed(normalized);
  } catch (e) {
    const error = e instanceof Error ? e : String(e);
    console.error(typeLine, error);
    return { result: null, error, typeLine };
  }

  const { results } = typeLineParser;
  const result = makeUnique(results);
  if (result.length === 0) {
    console.error(typeLine, 'Incomplete parse');
    return { result: null, error: 'Incomplete parse', typeLine };
  }
  if (result.length > 1) {
    return { result, error: 'Ambiguous parse', typeLine };
  }
  return { result, error: null, typeLine };
};

/**
 * @param {CardInput} card
 * @returns {string | null}
 */
const cardToGraphViz = (card) => {
  const { abilities } = parseCard(card);
  if (!abilities) return null;
  const result = [abilities];

  /**
   * @param {any} obj
   * @param {number} myId
   * @returns {[Array<{id: number, label: string}>, Array<{from: number, to: number, label: string}>, number]}
   */
  function recurse(obj, myId = 1) {
    /** @type {Array<{id: number, label: string}>} */
    const nodes = [];
    /** @type {Array<{from: number, to: number, label: string}>} */
    const edges = [];
    let nextId = myId + 1;
    if (Array.isArray(obj)) {
      nodes.push({ id: myId, label: ' ' });
      obj.forEach((elem, index) => {
        edges.push({ from: myId, to: nextId, label: index.toString() });
        /** @type {Array<{id: number, label: string}>} */
        let newNodes;
        /** @type {Array<{from: number, to: number, label: string}>} */
        let newEdges;
        [newNodes, newEdges, nextId] = recurse(elem, nextId);
        nodes.push(...newNodes);
        edges.push(...newEdges);
      });
    } else if (obj === null) {
      nodes.push({ id: myId, label: 'null' });
    } else if (obj.constructor === Object) {
      nodes.push({ id: myId, label: ' ' });
      for (const [key, value] of Object.entries(obj)) {
        edges.push({ from: myId, to: nextId, label: key });
        /** @type {Array<{id: number, label: string}>} */
        let newNodes;
        /** @type {Array<{from: number, to: number, label: string}>} */
        let newEdges;
        [newNodes, newEdges, nextId] = recurse(value, nextId);
        nodes.push(...newNodes);
        edges.push(...newEdges);
      }
    } else {
      nodes.push({ id: myId, label: obj.toString() });
    }
    return [nodes, edges, nextId];
  }
  const [nodes, edges] = recurse(result[0][0]);

  const nodesStr = nodes
    .map(({ id, label }) => `${id} [label="${label}"];`)
    .join('\n  ');
  const edgesStr = edges
    .map(({ from, to, label }) => `${from} -> ${to} [label="${label}"];`)
    .join('\n  ');
  const lines = [
    'digraph g {',
    '  graph [rankdir = "LR", nodesep=0.1, ranksep=0.3];' +
      '  node [fontsize = "16", shape="record", height=0.1, color=lightblue2];',
    '  edge [fontsize = "14"];',
    `  ${nodesStr}`,
    `  ${edgesStr}`,
    '}',
  ];

  return lines.join('\n');
};

/**
 * Parse a multi-face card (adventure, transform, DFC, split, etc.), returning
 * a ParseResult for each face independently.
 *
 * Face detection priority:
 *  1. card.card_faces[] array (Scryfall card_faces structure)
 *  2. '\n//\n' separator in oracle_text (raw Scryfall combined oracle text)
 *  3. Fallback: parse the card as a single face
 *
 * @param {CardInput} card
 * @returns {MultiParseResult}
 */
const parseFaces = (card) => {
  const { name, oracle_text, layout, card_faces } = card;

  // 1. Scryfall-style card_faces array — most structured, preferred
  if (card_faces && card_faces.length > 0) {
    return {
      faces: card_faces.map((face) => ({
        faceName: face.name,
        result: parseCard({ name: face.name, oracle_text: face.oracle_text }),
      })),
      layout: layout || 'unknown',
    };
  }

  // 2. Raw Scryfall oracle_text with '\n//\n' separator (split cards)
  if (oracle_text && oracle_text.includes('\n//\n')) {
    const parts = oracle_text.split('\n//\n');
    const faceNames = name.split(' // ');
    return {
      faces: parts.map((text, i) => ({
        faceName: faceNames[i] ?? name,
        result: parseCard({ name: faceNames[i] ?? name, oracle_text: text }),
      })),
      layout: layout || 'split',
    };
  }

  // 3. Fallback: single face
  return {
    faces: [{ faceName: name, result: parseCard(card) }],
    layout: layout || 'normal',
  };
};

/**
 * Convenience function for adventure-layout cards.
 * Parses the creature face and adventure spell face independently.
 *
 * @param {CardFace} creatureFace
 * @param {CardFace} adventureFace
 * @returns {{ creature: ParseResult, adventure: ParseResult }}
 */
const parseAdventure = (creatureFace, adventureFace) => ({
  creature: parseCard({ name: creatureFace.name, oracle_text: creatureFace.oracle_text }),
  adventure: parseCard({ name: adventureFace.name, oracle_text: adventureFace.oracle_text }),
});

// ─── MTGOSDK-style ParsedCard builders (pa-4na) ────────────────────────────────

/**
 * Parse a Scryfall-style mana_cost string (e.g. "{2}{W}{W}", "{X}{B/G}{P}")
 * into a structured ManaCost object.
 * @param {string} raw
 * @returns {ManaCost}
 */
const parseManaCost = (raw) => {
  /** @type {ManaSymbol[]} */
  const symbols = [];
  let generic;
  let cmc = 0;
  const re = /\{([^}]+)\}/g;
  let match;
  while ((match = re.exec(raw)) !== null) {
    const body = match[1].toLowerCase();
    if (/^\d+$/.test(body)) {
      const amount = parseInt(body, 10);
      generic = (generic ?? 0) + amount;
      cmc += amount;
      symbols.push({ kind: 'generic', amount });
    } else if (body === 'x' || body === 'y' || body === 'z') {
      symbols.push({ kind: /** @type {'x'|'y'|'z'} */ (body) });
    } else if (body === 'c') {
      cmc += 1;
      symbols.push({ kind: 'colorless' });
    } else if (body === 's') {
      cmc += 1;
      symbols.push({ kind: 'snow' });
    } else if (body.includes('/p')) {
      cmc += 1;
      const color = body.replace('/p', '');
      symbols.push({
        kind: 'phyrexian',
        colors: /** @type {any[]} */ ([color]),
      });
    } else if (body.includes('/')) {
      cmc += 1;
      const parts = body.split('/');
      symbols.push({
        kind: 'hybrid',
        colors: /** @type {any[]} */ (parts.filter((p) => 'wubrg'.includes(p))),
      });
    } else if ('wubrg'.includes(body)) {
      cmc += 1;
      symbols.push({
        kind: 'colored',
        colors: /** @type {any[]} */ ([body]),
      });
    } else {
      symbols.push({ kind: 'generic' });
    }
  }
  /** @type {ManaCost} */
  const cost = { raw, symbols, cmc };
  if (generic !== undefined) cost.generic = generic;
  return cost;
};

/**
 * Convert a grammar-emitted ManaCostValue array (e.g. [1, 'r']) into a ManaCost.
 * @param {(string | number)[]} arr
 * @returns {ManaCost}
 */
const manaCostFromArray = (arr) => {
  /** @type {ManaSymbol[]} */
  const symbols = [];
  let generic;
  let cmc = 0;
  for (const el of arr) {
    if (typeof el === 'number') {
      generic = (generic ?? 0) + el;
      cmc += el;
      symbols.push({ kind: 'generic', amount: el });
    } else if (typeof el === 'string') {
      const c = el.toLowerCase();
      if (c === 'x' || c === 'y' || c === 'z') {
        symbols.push({ kind: /** @type {'x'|'y'|'z'} */ (c) });
      } else if (c === 'c') {
        cmc += 1;
        symbols.push({ kind: 'colorless' });
      } else if (c === 's') {
        cmc += 1;
        symbols.push({ kind: 'snow' });
      } else if (c === 'p') {
        symbols.push({ kind: 'phyrexian' });
      } else if ('wubrg'.includes(c)) {
        cmc += 1;
        symbols.push({ kind: 'colored', colors: /** @type {any[]} */ ([c]) });
      }
    }
  }
  /** @type {ManaCost} */
  const out = { raw: arr.map((x) => `{${x}}`).join(''), symbols, cmc };
  if (generic !== undefined) out.generic = generic;
  return out;
};

/**
 * Coerce a Scryfall P/T/loyalty/defense string into a typed PowerToughness.
 * @param {string | undefined} raw
 * @returns {PowerToughness | undefined}
 */
const coercePT = (raw) => {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (/^-?\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
};

/**
 * Flatten a parseTypeLine result's top node into super/main/sub arrays.
 * @param {any} node
 * @returns {ParsedTypeLine}
 */
const flattenTypeLineNode = (node) => {
  /** @type {any[]} */
  const supers = [];
  /** @type {any[]} */
  const mains = [];
  /** @type {string[]} */
  const subs = [];
  if (node.superType) {
    if (typeof node.superType === 'object' && node.superType.and) supers.push(...node.superType.and);
    else supers.push(node.superType);
  }
  if (node.type) {
    if (typeof node.type === 'object' && node.type.and) mains.push(...node.type.and);
    else mains.push(node.type);
  }
  if (node.subType) {
    if (typeof node.subType === 'object' && node.subType.and) subs.push(...node.subType.and);
    else if (typeof node.subType === 'string') subs.push(node.subType);
  }
  return { super: supers, main: mains, sub: subs };
};

/**
 * Parse a type_line string into ParsedTypeLine, falling back to empty on failure.
 * @param {string | undefined} typeLine
 * @returns {ParsedTypeLine}
 */
const buildTypeLine = (typeLine) => {
  if (!typeLine) return { super: [], main: [], sub: [] };
  const r = parseTypeLine(typeLine);
  if (!r.result || r.result.length === 0) return { super: [], main: [], sub: [] };
  return flattenTypeLineNode(r.result[0]);
};

/**
 * Determine whether the parsed type line is an instant/sorcery (spell).
 * @param {ParsedTypeLine} tl
 */
const isSpellTypes = (tl) =>
  tl.main.some((t) => t === 'instant' || t === 'sorcery');

const SIMPLE_KEYWORDS = new Set([
  'deathtouch', 'defender', 'flash', 'flying', 'haste', 'hexproof',
  'indestructible', 'intimidate', 'lifelink', 'reach', 'shroud',
  'trample', 'vigilance', 'flanking', 'phasing', 'shadow', 'horsemanship',
  'fear', 'provoke', 'storm', 'sunburst', 'epic', 'convoke', 'haunt',
  'delve', 'gravestorm', 'changeling', 'conspire', 'persist', 'wither',
  'retrace', 'exalted', 'cascade', 'rebound', 'infect', 'undying',
  'soulbond', 'unleash', 'cipher', 'evolve', 'extort', 'fuse', 'dethrone',
  'prowess', 'exploit', 'menace', 'devoid', 'ingest', 'myriad', 'skulk',
  'melee', 'undaunted', 'improvise', 'aftermath', 'ascend', 'assist',
  'mentor', 'riot', 'partner', 'for mirrodin!',
]);

/**
 * Classify a single AbilityNode (from ParseResult.abilities) into a
 * ParsedAbility or ParsedKeyword bucket.
 *
 * @param {any} node
 * @param {{ isSpell: boolean }} ctx
 * @returns {{ kind: 'keyword', value: ParsedKeyword } | { kind: 'ability', value: ParsedAbility }}
 */
const classifyNode = (node, ctx) => {
  // Bare keyword string
  if (typeof node === 'string') {
    return { kind: 'keyword', value: { keyword: node } };
  }
  if (node === null || typeof node !== 'object' || Array.isArray(node)) {
    return { kind: 'ability', value: { type: 'unknown', text: String(node) } };
  }
  // Unknown clause (partial parse fallback)
  if ('unknown' in node && typeof node.unknown === 'string') {
    return { kind: 'ability', value: { type: 'unknown', text: node.unknown } };
  }
  // Activated ability
  if ('activatedAbility' in node) {
    const eff = node.activatedAbility;
    const effects = Array.isArray(eff) ? eff : [eff];
    /** @type {ParsedAbility} */
    const ability = { type: 'activated', cost: node.costs, effects };
    if (node.abilityWord) ability.abilityWord = node.abilityWord;
    return { kind: 'ability', value: ability };
  }
  // Triggered ability
  if ('trigger' in node) {
    const eff = node.effect;
    const effects = Array.isArray(eff) ? eff : eff !== undefined ? [eff] : [];
    /** @type {ParsedAbility} */
    const ability = { type: 'triggered', trigger: node.trigger, effects };
    if (node.abilityWord) ability.abilityWord = node.abilityWord;
    return { kind: 'ability', value: ability };
  }
  // Modal
  if ('quantifier' in node && 'options' in node) {
    return { kind: 'ability', value: { type: 'modal', quantifier: node.quantifier, options: node.options } };
  }
  // Additional cost
  if ('additionalCost' in node) {
    return { kind: 'ability', value: { type: 'additionalCost', cost: node.additionalCost } };
  }
  // KeywordObject: single-key map whose key is a recognized keyword.
  const keys = Object.keys(node);
  if (keys.length === 1) {
    const key = keys[0];
    const val = node[key];
    // Heuristic: if the value is a ManaCostValue-ish ({mana: [...]}) or number,
    // treat as keyword with payload.
    if (val && typeof val === 'object' && 'mana' in val && Array.isArray(val.mana)) {
      return { kind: 'keyword', value: { keyword: key, cost: manaCostFromArray(val.mana) } };
    }
    if (typeof val === 'number') {
      return { kind: 'keyword', value: { keyword: key, value: val } };
    }
    if (typeof val === 'string' && SIMPLE_KEYWORDS.has(key)) {
      return { kind: 'keyword', value: { keyword: key, literal: val } };
    }
  }
  // Fallback: treat as a static or spell effect with a single EffectNode.
  /** @type {ParsedAbility} */
  const eff = ctx.isSpell
    ? { type: 'spell', effects: [node] }
    : { type: 'static', effects: [node] };
  return { kind: 'ability', value: eff };
};

/**
 * Split a ParseResult's abilities array into classified ParsedAbility[] and ParsedKeyword[].
 * @param {any[] | null} abilityNodes
 * @param {{ isSpell: boolean }} ctx
 * @returns {{ abilities: ParsedAbility[], keywords: ParsedKeyword[] }}
 */
const classifyAbilities = (abilityNodes, ctx) => {
  /** @type {ParsedAbility[]} */
  const abilities = [];
  /** @type {ParsedKeyword[]} */
  const keywords = [];
  if (!abilityNodes) return { abilities, keywords };
  for (const node of abilityNodes) {
    const c = classifyNode(node, ctx);
    if (c.kind === 'keyword') keywords.push(c.value);
    else abilities.push(c.value);
  }
  return { abilities, keywords };
};

/**
 * Build a ParsedCardFace from a face input + its ParseResult.
 * @param {{ name: string, oracle_text: string, type_line?: string, mana_cost?: string, power?: string, toughness?: string, loyalty?: string, defense?: string }} face
 * @param {ParseResult} result
 * @returns {ParsedCardFace}
 */
const buildFace = (face, result) => {
  const types = buildTypeLine(face.type_line);
  const { abilities, keywords } = classifyAbilities(result.abilities, { isSpell: isSpellTypes(types) });
  /** @type {ParsedCardFace} */
  const out = {
    name: face.name,
    abilities,
    keywords,
    unknownClauses: result.unknownClauses,
    oracleText: result.oracleText,
    confidence: result.confidence,
  };
  if (face.type_line) out.types = types;
  if (face.mana_cost) {
    const mc = parseManaCost(face.mana_cost);
    out.manaCost = mc;
    out.cmc = mc.cmc;
  }
  const power = coercePT(face.power);
  const toughness = coercePT(face.toughness);
  const loyalty = coercePT(face.loyalty);
  const defense = coercePT(face.defense);
  if (power !== undefined) out.power = power;
  if (toughness !== undefined) out.toughness = toughness;
  if (loyalty !== undefined) out.loyalty = loyalty;
  if (defense !== undefined) out.defense = defense;
  if (result.error) out.error = result.error;
  return out;
};

/**
 * MTGOSDK-style rich card parser. Composes parseCard() / parseFaces() output
 * with Scryfall catalog fields into a single ParsedCard surface.
 *
 * @param {CardInput} card
 * @returns {ParsedCard}
 */
const parseCardFull = (card) => {
  const layout = card.layout ?? 'normal';
  const types = buildTypeLine(card.type_line);
  const isSpell = isSpellTypes(types);

  // Multi-face routing (adventure / transform / modal_dfc / split / flip / meld)
  if (card.card_faces && card.card_faces.length > 0) {
    const multi = parseFaces(card);
    const faces = multi.faces.map(({ faceName, result }, i) => {
      const srcFace = card.card_faces?.[i] ?? { name: faceName, oracle_text: '' };
      return buildFace(
        {
          name: faceName,
          oracle_text: srcFace.oracle_text ?? '',
          type_line: srcFace.type_line,
          // Scryfall card_faces[] carries mana_cost/power/toughness on the face itself;
          // cast through to pick them up if present.
          mana_cost: /** @type {any} */ (srcFace).mana_cost,
          power: /** @type {any} */ (srcFace).power,
          toughness: /** @type {any} */ (srcFace).toughness,
          loyalty: /** @type {any} */ (srcFace).loyalty,
          defense: /** @type {any} */ (srcFace).defense,
        },
        result,
      );
    });
    // Aggregate the front face's abilities/keywords/unknownClauses to the top level
    const front = faces[0];
    /** @type {ParsedCard} */
    const out = {
      name: card.name,
      layout,
      faces,
      types,
      abilities: front ? front.abilities : [],
      keywords: front ? front.keywords : [],
      unknownClauses: front ? front.unknownClauses : [],
      oracleText: front ? front.oracleText : '',
      confidence: front ? front.confidence : 0,
    };
    if (faces.length > 1) out.otherFace = faces[1].name;
    if (card.mana_cost) {
      const mc = parseManaCost(card.mana_cost);
      out.manaCost = mc;
      out.cmc = mc.cmc;
    } else if (card.cmc !== undefined) {
      out.cmc = card.cmc;
    }
    if (card.colors) out.colors = card.colors;
    if (card.color_identity) out.colorIdentity = card.color_identity;
    const power = coercePT(card.power);
    const toughness = coercePT(card.toughness);
    const loyalty = coercePT(card.loyalty);
    const defense = coercePT(card.defense);
    if (power !== undefined) out.power = power;
    if (toughness !== undefined) out.toughness = toughness;
    if (loyalty !== undefined) out.loyalty = loyalty;
    if (defense !== undefined) out.defense = defense;
    return out;
  }

  // Single-face
  const result = parseCard(card);
  const { abilities, keywords } = classifyAbilities(result.abilities, { isSpell });

  /** @type {ParsedCard} */
  const out = {
    name: card.name,
    layout,
    types,
    abilities,
    keywords,
    unknownClauses: result.unknownClauses,
    oracleText: result.oracleText,
    confidence: result.confidence,
  };
  if (card.mana_cost) {
    const mc = parseManaCost(card.mana_cost);
    out.manaCost = mc;
    out.cmc = mc.cmc;
  } else if (card.cmc !== undefined) {
    out.cmc = card.cmc;
  }
  if (card.colors) out.colors = card.colors;
  if (card.color_identity) out.colorIdentity = card.color_identity;
  const power = coercePT(card.power);
  const toughness = coercePT(card.toughness);
  const loyalty = coercePT(card.loyalty);
  const defense = coercePT(card.defense);
  if (power !== undefined) out.power = power;
  if (toughness !== undefined) out.toughness = toughness;
  if (loyalty !== undefined) out.loyalty = loyalty;
  if (defense !== undefined) out.defense = defense;
  if (result.error) out.error = result.error;
  return out;
};

export { cardToGraphViz, parseAdventure, parseCard, parseCardFull, parseFaces, parseTypeLine };
