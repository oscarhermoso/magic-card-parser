import { Parser, Grammar } from 'nearley';

import magicCardGrammar from './generated/magicCardGrammar.js';
import typeLineGrammar from './generated/typeLineGrammar.js';

/** @typedef {import('./index.d.ts').CardInput} CardInput */
/** @typedef {import('./index.d.ts').ParseResult} ParseResult */
/** @typedef {import('./index.d.ts').TypeLineResult} TypeLineResult */

const makeUnique = (lst) => {
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
    const { name, oracle_text, layout } = card;

    if (layout && layout != 'normal') {
        // https://scryfall.com/docs/api/layouts
        return { parsed: null, error: 'Currently only support normal layout', oracleText: oracle_text, card };
    }

    const magicCardParser = new Parser(compiledMagicCardGrammar);
    const shortenedName = name.split(',')[0];
    let oracleText = oracle_text.split(name).join('~').split(shortenedName).join('~');
    // Also replace first-word name references (e.g. "Loran" from "Loran of the Third Path")
    // Only when the first word is unique enough (not a common MTG word) and appears standalone
    const firstName = shortenedName.split(' ')[0];
    if (firstName.length > 3 && firstName !== shortenedName && !/^(goblin|dragon|angel|demon|human|zombie|soldier|knight|wizard|elf|beast|spirit|vampire|bear|cat|dog|bird|snake|spider|wolf|giant|troll|ogre|orc|golem|elemental|artifact|creature|land|enchant|instant|sorcery|planeswalker|legendary|token|tribal|snow|basic|world|forest|island|swamp|mountain|plains)$/i.test(firstName)) {
      oracleText = oracleText.split(firstName).join('~');
    }
    oracleText = oracleText.toLowerCase();
    // Replace new-style self-references with ~ (e.g. "this creature" → "~")
    oracleText = oracleText.replace(/\bthis (creature|artifact|land|enchantment|permanent)\b/g, '~');

    try {
        magicCardParser.feed(oracleText);
    } catch (error) {
        return { parsed: null, error, oracleText, card };
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
    } catch (error) {
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

    function recurse(obj, myId = 1) {
        const nodes = [];
        const edges = [];
        let nextId = myId + 1;
        if (Array.isArray(obj)) {
            nodes.push({ id: myId, label: ' ' });
            obj.forEach((elem, index) => {
                edges.push({ from: myId, to: nextId, label: index.toString() });
                let newNodes;
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
                let newNodes;
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

    const nodesStr = nodes.map(({ id, label }) => `${id} [label="${label}"];`).join('\n  ');
    const edgesStr = edges.map(({ from, to, label}) => `${from} -> ${to} [label="${label}"];`).join('\n  ');
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
