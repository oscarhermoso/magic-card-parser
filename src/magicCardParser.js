import nearley from 'nearley';
const { Parser, Grammar } = nearley;

// @ts-ignore — generated CJS grammar files, bundled by tsup
import magicCardGrammar from './generated/magicCardGrammar.cjs';
// @ts-ignore — generated CJS grammar files, bundled by tsup
import typeLineGrammar from './generated/typeLineGrammar.cjs';
import { replaceCardName } from './nameReplacement.js';

/** @typedef {import('./index.d.ts').CardInput} CardInput */
/** @typedef {import('./index.d.ts').ParseResult} ParseResult */
/** @typedef {import('./index.d.ts').TypeLineResult} TypeLineResult */

/**
 * @param {any[]} lst
 * @returns {any[]}
 */
const makeUnique = (lst) => {
    /** @type {string[]} */
    const seen = [];
    /** @type {any[]} */
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
    const { name, oracle_text, layout } = card;

    if (layout && layout != 'normal') {
        // https://scryfall.com/docs/api/layouts
        return { result: null, parsed: null, error: 'Currently only support normal layout', oracleText: oracle_text, card };
    }

    const magicCardParser = new Parser(compiledMagicCardGrammar);
    let oracleText = replaceCardName(oracle_text, name);

    try {
        magicCardParser.feed(oracleText);
    } catch (/** @type {any} */ error) {
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
    try {
        typeLineParser.feed(typeLine);
    } catch (/** @type {any} */ error) {
        console.error(typeLine, error);
        return { result: null, error, typeLine };
    }

    const { results } = typeLineParser;
    const result = makeUnique(results);
    if (result.length === 0) {
        console.error(typeLine, "Incomplete parse");
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
            nodes.push({ id: myId, label: 'null'});
        } else if (obj.constructor === Object) {
            nodes.push({ id: myId, label: ' ' });
            for (const [key, value] of Object.entries(obj)) {
                edges.push({ from: myId, to: nextId, label: key })
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

    const nodesStr = nodes.map((/** @type {{id: number, label: string}} */ { id, label }) => `${id} [label="${label}"];`).join('\n  ');
    const edgesStr = edges.map((/** @type {{from: number, to: number, label: string}} */ { from, to, label}) => `${from} -> ${to} [label="${label}"];`).join('\n  ');
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
}

export { cardToGraphViz, parseCard, parseTypeLine };
