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
    // Ethersworn Canonist: simplify conditional restriction (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/each player who has cast a nonartifact spell this turn can't cast additional nonartifact spells/g, "players can't cast nonartifact spells");
    // Aluren: simplify free-cast clause (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/any player may cast (.*?) without paying their mana costs and as though they had flash/g, 'players cast $1 without paying its mana cost');
    // Turnabout: simplify to choose type + tap/untap all permanents (engine handles tapped/untapped filtering)
    oracleText = oracleText.replace(/tap all untapped permanents of the chosen type target player controls, or untap all tapped permanents of that type that player controls/g, 'tap or untap all permanents target player controls');
    oracleText = oracleText.replace(/\bthat player\b/g, 'they');
    // Scrap Trawler: simplify compound trigger and reorder return clause
    oracleText = oracleText.replace(/~ dies or another artifact you control is put into a graveyard from the battlefield/g, 'an artifact you control is put into a graveyard from the battlefield');
    oracleText = oracleText.replace(/return to your hand target (.*?) in your graveyard/g, 'return target $1 in your graveyard to your hand');
    oracleText = oracleText.replace(/ with lesser mana value/g, '');
    // Torsten: simplify "put any number of X and/or Y cards from among them into your hand and the rest on the bottom..."
    oracleText = oracleText.replace(/put any number of creature and\/or land cards from among them into your hand and the rest on the bottom of your library in a random order/g, 'put creature and land cards from among them into your hand');
    // Balance: replace complex equalization text with simple per-type sacrifice/discard (engine handles min-counting)
    oracleText = oracleText.replace(/each player chooses a number of lands they control equal to the number of lands controlled by the player who controls the fewest, then sacrifices the rest\. players discard cards and sacrifice creatures the same way\./g, 'each player sacrifices lands. each player sacrifices creatures. each player discards cards.');
    // Flash: strip conditional sacrifice clause (engine handles sacrifice-unless-pay)
    oracleText = oracleText.replace(/\. if you do, sacrifice it unless you pay its mana cost reduced by \{2\}\./g, '.');
    // Memory Jar: strip "face down" and delayed return clause (engine handles delayed trigger)
    oracleText = oracleText.replace(/ face down/g, '');
    oracleText = oracleText.replace(/\. at the beginning of the next end step, each player discards their hand and returns to their hand each card they exiled this way\./g, '.');
    // Sylvan Library: strip "additional" (grammar handles "draw N cards" not "draw N additional cards") and "If you do" clause (engine handles)
    oracleText = oracleText.replace(/draw two additional cards/g, 'draw two cards');
    oracleText = oracleText.replace(/\. if you do, choose two cards in your hand drawn this turn\. for each of those cards, pay 4 life or put the card on top of your library\./g, '.');
    // Animate Dead: strip complex loses/gains text, simplify to ETB reanimate + leaves sacrifice (engine handles)
    oracleText = oracleText.replace(/when ~ enters, if it's on the battlefield, it loses "enchant creature card in a graveyard" and gains "enchant creature put onto the battlefield with ~\." return enchanted creature card to the battlefield under your control and attach ~ to it\. when ~ leaves the battlefield, that creature's controller sacrifices it\./g, 'when ~ enters, return enchanted creature card to the battlefield under your control. when ~ leaves the battlefield, sacrifice enchanted creature.');

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
