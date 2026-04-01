import nearley from 'nearley';
const { Parser, Grammar } = nearley;

import magicCardGrammar from './generated/magicCardGrammar.cjs';
import typeLineGrammar from './generated/typeLineGrammar.cjs';
import { replaceCardName } from './nameReplacement.js';

/** @typedef {import('./index.d.ts').CardInput} CardInput */
/** @typedef {import('./index.d.ts').CardFace} CardFace */
/** @typedef {import('./index.d.ts').ParseResult} ParseResult */
/** @typedef {import('./index.d.ts').FaceParseResult} FaceParseResult */
/** @typedef {import('./index.d.ts').TypeLineResult} TypeLineResult */

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

const compiledMagicCardGrammar = Grammar.fromCompiled(magicCardGrammar);
const compiledTypeLineGrammar = Grammar.fromCompiled(typeLineGrammar);

/**
 * @param {CardInput} card
 * @returns {ParseResult}
 */
const parseCard = (card) => {
  const { name, oracle_text } = card;

  const magicCardParser = new Parser(compiledMagicCardGrammar);
  let oracleText = replaceCardName(oracle_text, name);

  try {
    magicCardParser.feed(oracleText);
  } catch (e) {
    const error = e instanceof Error ? e : String(e);
    return { result: null, parsed: null, error, oracleText, card };
  }

  const { results } = magicCardParser;
  const result = makeUnique(results);
  if (result.length === 0) {
    return { result: null, error: 'Incomplete parse', oracleText, card };
  }
  if (result.length > 1) {
    return { result, error: 'Ambiguous parse', oracleText, card };
  }
  return { result, error: null, oracleText, card };
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
  const { result } = parseCard(card);
  if (!result) return null;

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
 * @returns {FaceParseResult}
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

export { cardToGraphViz, parseAdventure, parseCard, parseFaces, parseTypeLine };
