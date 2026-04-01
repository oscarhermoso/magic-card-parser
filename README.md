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

Include it in your project with `import { parseCard, parseFaces } from '@oscarhermoso/magic-card-parser'`.

### v1.0 API

```typescript
// Parse a single-face card
const r = parseCard({ name: 'Lightning Bolt', oracle_text: 'Deal 3 damage to any target.' });
r.abilities;       // AbilityNode[] | null — best parse (null on error)
r.candidates;      // AbilityNode[][] | null — all parse candidates
r.confidence;      // number 0-1 (1 = fully parsed, 0 = parse failed)
r.unknownClauses;  // string[] — unrecognized text segments
r.oracleText;      // string — normalized oracle text
r.error;           // string | undefined — "Ambiguous parse" / "Incomplete parse" / error message

// Parse a multi-face card (adventure, transform, DFC, split, etc.)
const mpr = parseFaces({
  name: 'Bonecrusher Giant // Stomp',
  oracle_text: '',
  layout: 'adventure',
  card_faces: [
    { name: 'Bonecrusher Giant', oracle_text: '...' },
    { name: 'Stomp', oracle_text: '...' },
  ],
});
mpr.faces;   // Array<{ faceName: string; result: ParseResult }>
mpr.layout;  // CardLayout string
```

`parseCard` automatically replaces the card's name with `CARD_NAME` in oracle text and lowercases before parsing. The `abilities` field is the first (best) parse candidate. `candidates` contains all possible parses — length > 1 means an ambiguous parse.

### v0.x → v1.0 Migration

| v0.x field | v1.0 replacement | Notes |
|---|---|---|
| `result` | `candidates` | Same data, renamed |
| `result[0]` | `abilities` | Convenience shorthand for first candidate |
| `error: null` | `error: undefined` | Success now omits the field |
| `error: Error` | `error: string` | Error objects are coerced to message strings |
| `card` | _(removed)_ | Pass the card object yourself if needed |
| `parsed` | _(removed)_ | Was an alias for `result` |
| `FaceParseResult` | `MultiParseResult` | Type renamed; alias kept for compat |

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