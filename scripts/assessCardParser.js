import fs from 'fs';
import os from 'os';
import { isMainThread, parentPort, Worker, workerData } from 'worker_threads';
import { parseCard, parseTypeLine } from '../src/magicCardParser.js';

if (!fs.existsSync('./oracle_cards.json')) {
    console.error("oracle_cards.json does not exist, run 'npm run fetch' to download it");
    process.exit(1);
}

const runService = (data) => {
    return new Promise((resolve, reject) => {
        const worker = new Worker(new URL('./assessCardParser.js', import.meta.url), { workerData: data });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
        });
    });
};

if (isMainThread) {
    const cpuCount = os.cpus().length;

    const cards = JSON.parse(fs.readFileSync('./oracle_cards.json'));

    (async () => {
        const successes = [];
        const ambiguous = [];
        const failures = [];
        const validCards = cards.filter(({ layout, oracle_id, border_color: borderColor, type_line: type, set }) => {
            const typeLineLower = type.toLowerCase();
            if (
                layout != 'token' &&
                borderColor !== 'silver' &&
                !typeLineLower.includes('vanguard') &&
                !typeLineLower.includes('conspiracy') &&
                !typeLineLower.includes('hero') &&
                !typeLineLower.includes('plane ') &&
                !typeLineLower.includes('contraption ') &&
                !typeLineLower.includes('emblem') &&
                !typeLineLower.includes('token') &&
                typeLineLower !== 'card' &&
                set !== 'cmb1'
            ) {
                return true;
            }
            return false;
        });
        const threads = [];
        for (let i = 0; i < cpuCount; i++) {
            threads.push(
                runService(
                    validCards.slice(
                        Math.floor((i * validCards.length) / cpuCount),
                        Math.floor(((i + 1) * validCards.length) / cpuCount),
                    ),
                ),
            );
        }
        const results = (await Promise.all(threads)).map((s) => JSON.parse(s)).flat();
        for (const {
            result,
            error,
            oracleText,
            card: { mana_cost: manaCost, power, toughness, loyalty, id: cardID, name, type_line: type },
        } of results) {
            if (!error) {
                try {
                successes.push({
                    cardID,
                    name,
                    manaCost,
                    typeLine: parseTypeLine(type.toLowerCase()).result[0],
                    parsed: result[0],
                    power,
                    toughness,
                    loyalty,
                });
                } catch (err) {
                    console.error(name);
                }
            } else if (result) {
                ambiguous.push({
                    cardID,
                    name,
                    manaCost,
                    typeLine: parseTypeLine(type.toLowerCase()).result[0],
                    oracleText,
                    parsed: result[0],
                    otherParses: result.slice(1),
                    power,
                    toughness,
                    loyalty,
                });
            } else {
                failures.push({ name, oracleText, error });
            }
        }
        console.info('successes', successes.length);
        console.info('ambiguous', ambiguous.length);
        for (let i = 0; i < 1; i++) {
            console.info(JSON.stringify(ambiguous[Math.floor(Math.random() * ambiguous.length)], null, 2));
        }
        console.info('failures', failures.length);
        for (let i = 0; i < 8; i++) {
            console.info(JSON.stringify(failures[Math.floor(Math.random() * failures.length)]));
        }
        console.info(
            'parse rate',
            successes.length + ambiguous.length,
            '/',
            successes.length + ambiguous.length + failures.length,
        );
    })();
} else {
    const result = workerData.map(parseCard);
    parentPort.postMessage(JSON.stringify(result));
}
