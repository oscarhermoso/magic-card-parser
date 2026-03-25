# Magic Card Parser

A [Nearley](https://nearley.js.org/) grammar parser for Magic: The Gathering oracle text. Parses card text into a structured AST for programmatic use.

### Current Compatibility

Tested against the top 1000 most-cubed cards on [CubeCobra](https://cubecobra.com/) (excluding un-cards):

| | Count | % of testable |
|---|---|---|
| Parsed OK | 650 | 67.4% |
| Ambiguous parse | 66 | 6.8% |
| Parse error | 248 | 25.7% |
| Skipped (non-normal layout) | 36 | — |

The parser currently supports `normal` layout cards only (no split, transform, adventure, saga, or leveler layouts).

Top categories of unsupported patterns:

| Pattern | Cards |
|---|---|
| Enters tapped unless | 21 |
| X / equal to expressions | 16 |
| Copy / becomes | 13 |
| Keyword alternate costs (affinity, evoke, companion) | 12 |
| Protection from | 9 |
| Choose N (modal commands) | 8 |
| Devotion / card types among | 8 |

## Installation

This package is published to [GitHub Packages](https://github.com/oscarhermoso/magic-card-parser/packages).

### 1. Configure npm registry

Create or update `.npmrc` in your project root:

```
@oscarhermoso:registry=https://npm.pkg.github.com/
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

You'll need a [GitHub personal access token](https://github.com/settings/tokens) with `read:packages` scope, set as the `GITHUB_TOKEN` environment variable.

### 2. Install

```bash
npm install @oscarhermoso/magic-card-parser
```

### 3. Usage

```javascript
// ESM
import { parseCard, parseTypeLine } from '@oscarhermoso/magic-card-parser';

// CommonJS
const { parseCard, parseTypeLine } = require('@oscarhermoso/magic-card-parser');
```

## Overview

Include it in your project with `import { parseCard } from '@oscarhermoso/magic-card-parser'`.
`parseCard` takes a single argument, `card`, that must include the properties
`name` and `oracle_text`. It will automatically replace the cards name with `~`
in the oracle text and convert to lowercase before parsing. The return value is
an object like the following:
```json
{
  "result": [
    [
      {
        "costs": "tap",
        "activatedAbility": {
          "create": {
            "amount": 1,
            "type": { "and": ["human", "creature"] },
            "size": { "power": 1, "toughness": 1 },
            "color": "w"
          }
        }
      },
      {
        "asLongAs": {
          "actor": "you",
          "does": { "comparison": { "lte": 5 }, "value": "life" }
        },
        "effect": {
          "what": {
            "object": { "type": "creature", "prefixes": ["other"] },
            "suffix": { "actor": "you", "does": "control" }
          },
          "does": { "powerToughnessMod": { "powerMod": 2, "toughnessMod": 2 } }
        },
        "abilityWord": "fateful hour"
      }
    ]
  ],
  "error": null,
  "oracleText": "{t}: create a 1/1 white human creature token.\nfateful hour -- as long as you have 5 or less life, other creatures you control get +2/+2.",
  "card": {
    "name": "Thraben Doomsayer",
    "oracle_text": "{T}: Create a 1/1 white Human creature token.\nFateful hour — As long as you have 5 or less life, other creatures you control get +2/+2.",
    "layout": "normal"
  }
}
```
Most notably `result` is an array of possible parses. If there is more than one
possible parse, meaning it parses to a different json value, than it will
report an error of `"Ambiguous parse"`. If the parse is incomplete, meaning it
expected more input than it got, then it will return a `null` result with the
error `"Incomplete parse"`. Finally, if the input was invalid, meaning there is
no possible parse tree for it, you will get a `null` result and an `Error`
object describing where the parser failed.

We do not guarantee that all the parses are correct, it is just too much work
to manually review all of them at this time. We do check many of the parses
and fix any errors we discover from those, so we have high confidence that the
vast majority of the parses are correct.

## Contributor Guide

Contributions are welcome. The grammar lives in `nearley/magicCard.ne` and compiles with nearleyc.

### Testing

```bash
npm test                        # run test suite (vitest)
node scripts/coverage.mjs       # grammar rule coverage analysis
node scripts/topCardsTest.mjs   # compatibility test against top 1000 cubed cards
```

### Key files

- `nearley/magicCard.ne` — Main grammar (Nearley/Earley parser)
- `nearley/enums.ne` — Type enums (creature types, keywords, etc.)
- `src/magicCardParser.js` — Parser entry point
- `src/nameReplacement.js` — Preprocessor (name substitution, Unicode normalization)
- `src/index.d.ts` — TypeScript type definitions for the AST
- `__tests__/simpleIsBest.test.ts` — 368-card test suite with snapshots
- `__tests__/astValidator.test.ts` — Validates AST shapes match type definitions