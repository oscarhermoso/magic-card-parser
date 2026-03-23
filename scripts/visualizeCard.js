import fs from 'fs';
import graphviz from 'graphviz';
import { cardToGraphViz } from '../src/magicCardParser.js';

if (!fs.existsSync('./oracle_cards.json')) {
    console.error("oracle_cards.json does not exist, run 'npm run fetch' to download it");
    process.exit(1);
}

const cards = JSON.parse(fs.readFileSync('./oracle_cards.json', 'utf-8'));
let script = null;
while (script === null) {
    const card = cards[Math.floor(Math.random() * cards.length)];
    script = cardToGraphViz(card);
}
try {
    const graph = await new Promise((resolve, reject) => graphviz.parse(script, resolve, (code, out, err) => reject([code, out, err])));
    graph.output('svg', 'cardVisualization.svg');
} catch(err) {
    console.error(err);
}
