import nearley from 'nearley';
const { Parser, Grammar } = nearley;

// @ts-ignore — generated CJS grammar files, bundled by tsup
import magicCardGrammar from './generated/magicCardGrammar.cjs';
// @ts-ignore — generated CJS grammar files, bundled by tsup
import typeLineGrammar from './generated/typeLineGrammar.cjs';

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
    oracleText = oracleText.replace(/\bthis (creature|artifact|land|enchantment|permanent|card)\b/g, '~');
    // Hullbreacher: strip draw exception clause (semantics handled by bridge/ScryfallParser)
    oracleText = oracleText.replace(/ except the first one they draw in each of their draw steps/g, '');
    // Lab Maniac: strip while-condition clause and simplify win condition (semantics handled by bridge/ScryfallParser)
    oracleText = oracleText.replace(/ while your library has no cards in it/g, '');
    oracleText = oracleText.replace(/\bwin the game\b/g, 'win');
    // Phyrexian Metamorph: rewrite "may have ~ enter as" → "~ becomes" (semantics handled by bridge/ScryfallParser)
    oracleText = oracleText.replace(/you may have (~) enter as (a copy of [^,]+) on the battlefield/g, '$1 becomes $2');
    // Ethersworn Canonist: simplify conditional restriction (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/each player who has cast a nonartifact spell this turn can't cast additional nonartifact spells/g, "players can't cast nonartifact spells");
    // Aluren: simplify free-cast clause (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/any player may cast (.*?) without paying their mana costs and as though they had flash/g, 'players cast $1 without paying its mana cost');
    // Phyrexian Revoker: strip "nonland" from "choose a nonland card name" (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/choose a nonland card name/g, 'choose a card name');
    // Phyrexian Revoker: normalize "sources with the chosen name" (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/sources with the chosen name/g, 'permanents with that name');
    // Fastbond: strip duration from "any number of lands on each of your turns" (semantics handled by bridge/engine)
    oracleText = oracleText.replace(/any number of lands on each of your turns/g, 'any number of lands');
    oracleText = oracleText.replace(/if it wasn't the first land you played this turn, /g, '');
    // Turnabout: simplify to choose type + tap/untap all permanents (engine handles tapped/untapped filtering)
    // MUST run before "that player" → "they" replacement below
    oracleText = oracleText.replace(/tap all untapped permanents of the chosen type target player controls, or untap all tapped permanents of that type that player controls/g, 'tap or untap all permanents target player controls');
    // Esper Sentinel: strip "their first" and "each turn" from trigger (engine handles per-turn tracking)
    // Rewrite "that player pays" → "they pay" (grammar doesn't have "that player" as regular player)
    oracleText = oracleText.replace(/casts their first (.*?) each turn/g, 'casts a $1');
    oracleText = oracleText.replace(/\bthat player\b/g, 'they');
    // Irreverent Gremlin: strip "do this only once each turn" (engine handles per-turn limit)
    oracleText = oracleText.replace(/ do this only once each turn\./g, '');
    // Laelia: simplify exile trigger — "one or more cards are put into exile from X and/or Y" → "a card is put into exile from X"
    oracleText = oracleText.replace(/one or more cards are put into exile from your library and\/or your graveyard/g, 'a card is put into exile from your library');
    // Scrap Trawler: simplify compound trigger and reorder return clause
    oracleText = oracleText.replace(/~ dies or another artifact you control is put into a graveyard from the battlefield/g, 'an artifact you control is put into a graveyard from the battlefield');
    oracleText = oracleText.replace(/return to your hand target (.*?) in your graveyard/g, 'return target $1 in your graveyard to your hand');
    oracleText = oracleText.replace(/ with lesser mana value/g, '');
    // Land Tax: strip land comparison condition (engine handles it)
    oracleText = oracleText.replace(/, if an opponent controls more lands than you,/g, ',');
    // Sram's Expertise: strip "with mana value N or less" filter and "from your hand" (engine handles)
    oracleText = oracleText.replace(/you may cast a spell with mana value \d+ or less from your hand without paying its mana cost/g, 'you may cast a spell without paying its mana cost');
    // Torsten: simplify "put any number of X and/or Y cards from among them into your hand and the rest on the bottom..."
    oracleText = oracleText.replace(/put any number of creature and\/or land cards from among them into your hand and the rest on the bottom of your library in a random order/g, 'put creature and land cards from among them into your hand');
    // Fractured Identity: simplify "each player other than its controller creates" → imperative "create"
    oracleText = oracleText.replace(/each player other than its controller creates/g, 'create');
    // Nettlecyst: "and/or" between types → "or" (semantically equivalent for counting)
    oracleText = oracleText.replace(/\band\/or\b/g, 'or');
    // Nettlecyst: living weapon reminder text is stripped by grammar (parenthesized), but ensure equip line parses
    // Balance: replace complex equalization text with simple per-type sacrifice/discard (engine handles min-counting)
    oracleText = oracleText.replace(/each player chooses a number of lands they control equal to the number of lands controlled by the player who controls the fewest, then sacrifices the rest\. players discard cards and sacrifice creatures the same way\./g, 'each player sacrifices lands. each player sacrifices creatures. each player discards cards.');
    // Channel: strip timing clause "any time you could activate a mana ability," (engine handles timing)
    oracleText = oracleText.replace(/any time you could activate a mana ability, /g, '');
    // Maze of Ith: simplify bidirectional prevent to unidirectional (engine handles both directions)
    oracleText = oracleText.replace(/that would be dealt to and dealt by that creature/g, 'that would be dealt to that creature');

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
