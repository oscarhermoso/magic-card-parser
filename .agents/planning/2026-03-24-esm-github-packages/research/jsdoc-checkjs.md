# JSDoc + checkJs Type Pattern

## Key Findings

### Current State
- `src/magicCardParser.js` — plain JS, no JSDoc annotations
- `src/index.d.ts` — comprehensive hand-maintained type definitions
- `tsconfig.json` has `checkJs: false` — no type-checking on JS files
- Tests use `require()` and validate runtime shapes match declared types

### Required tsconfig Changes
| Setting | Current | Needed |
|---------|---------|--------|
| `checkJs` | `false` | `true` |
| `module` | `commonjs` | `es2020` or `nodenext` |
| `noEmit` | `true` | keep (tsup handles emit) |

### JSDoc Annotation Pattern
```javascript
/** @typedef {import('./index.d.ts').CardInput} CardInput */

/**
 * @param {CardInput} card
 * @returns {import('./index.d.ts').ParseResult}
 */
export function parseCard(card) { ... }
```

### Type Declaration Generation
- Keep existing `index.d.ts` as the authoritative type source
- tsup `dts: true` can generate declarations, or use tsc separately
- Since types already exist in `index.d.ts`, may be simpler to keep maintaining it manually and just include it in the package

### Approach
- Add JSDoc `@param` / `@returns` annotations referencing types from `index.d.ts`
- Enable `checkJs: true` to get type errors in the JS source
- Keep `index.d.ts` as the published type declaration file
