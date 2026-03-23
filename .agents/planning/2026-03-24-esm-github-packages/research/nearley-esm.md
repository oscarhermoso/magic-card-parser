# Nearley ESM Compatibility

## Key Findings

### Nearley Core Library
- **No native ESM support** — UMD only, no `exports` field in package.json
- Only has `"main": "lib/nearley.js"` (CommonJS)
- Uses UMD pattern: detects `module.exports` or `window`

### Generated Grammar Files
- Default output: IIFE + CommonJS UMD wrapper (`module.exports = grammar`)
- Grammar object shape: `{ Lexer, ParserRules, ParserStart }`
- **nearleyc supports `--export esmodule`** flag — outputs `export default { ... }`

### Grammar.fromCompiled() API
- Expects: `{ Lexer: ..., ParserRules: [...], ParserStart: "..." }`
- Returns: `Grammar` instance for `Parser` constructor
- Format is a plain object — no class or ESM-specific requirements

### Strategy for Dual Format
Since nearley is a runtime dependency:
1. **Keep nearley as external** — tsup won't bundle it
2. **tsup handles CJS interop** — for ESM output, tsup resolves `require('nearley')` to an ESM-compatible import
3. **Generated grammars get bundled** — they're local files, tsup inlines them
4. For ESM output, tsup's `createRequire` banner shim handles any remaining `require()` calls

### Alternative: Bundle nearley
- Could use `noExternal: ['nearley']` to bundle nearley into the output
- This avoids consumers needing nearley as a dependency
- Trade-off: larger bundle size (~30KB) but simpler for consumers
