# ESM Conversion & GitHub Packages Publishing

## COMPLETED

All 9 steps implemented and verified:

1. Installed tsup, configured dual ESM/CJS build
2. Converted magicCardParser.js to ESM with JSDoc annotations
3. Updated package.json: @oscarhermoso/magic-card-parser@0.4.0, type:module, exports map, publishConfig
4. Updated tsconfig.json: ES2020 module, bundler resolution, checkJs enabled
5. Converted tests to ESM imports, fixed grammar strict-mode bug (missing `let`)
6. Converted utility scripts to ESM
7. Added .github/workflows/publish.yml for GitHub Packages
8. Updated README with installation instructions
9. Validated in mtg-cube-simulator — dev server starts clean, no require errors

## Key discoveries
- nearley grammars use sloppy-mode JS — had to fix implicit global `result` variable
- Generated grammars need .cjs extension + @ts-nocheck for ESM/strict compatibility
- nearley only provides default export in ESM — use `import nearley from 'nearley'`
- vitest transforms .cjs to strict mode ESM — `import from .cjs` triggers sloppy-mode bugs
