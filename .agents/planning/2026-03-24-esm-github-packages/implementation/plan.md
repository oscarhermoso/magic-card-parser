# Implementation Plan: ESM Conversion & GitHub Packages Publishing

## Checklist

- [ ] Step 1: Install tsup and configure build
- [ ] Step 2: Convert source to ESM with JSDoc annotations
- [ ] Step 3: Update package.json for dual format and GitHub Packages
- [ ] Step 4: Update tsconfig.json for ESM and checkJs
- [ ] Step 5: Update tests to ESM imports and verify
- [ ] Step 6: Convert utility scripts to ESM
- [ ] Step 7: Add GitHub Actions publish workflow
- [ ] Step 8: Update README with installation instructions
- [ ] Step 9: Validate with mtg-cube-simulator

---

## Step 1: Install tsup and configure build

**Objective:** Add tsup as a dev dependency and create the build configuration for dual ESM/CJS output.

**Implementation guidance:**
- `npm install -D tsup`
- Create `tsup.config.ts` with dual format output (`esm` + `cjs`), `.mjs`/`.cjs` extensions, `nearley` as external, `createRequire` banner shim for ESM, sourcemaps enabled
- Ensure generated grammar files exist first by running `npm run build` (the existing nearley build)

**Test requirements:**
- Run `npx tsup` and verify `dist/` contains `index.mjs`, `index.cjs`
- Verify `dist/index.mjs` contains `import` syntax and the `createRequire` shim
- Verify `dist/index.cjs` contains `require`/`module.exports` syntax

**Integration:** This is the foundation — all subsequent steps depend on the build working.

**Demo:** `dist/` directory exists with `.mjs` and `.cjs` files that can be inspected.

---

## Step 2: Convert source to ESM with JSDoc annotations

**Objective:** Convert `src/magicCardParser.js` from CommonJS to ES module syntax and add JSDoc type annotations.

**Implementation guidance:**
- Replace `const { Parser, Grammar } = require('nearley')` with `import { Parser, Grammar } from 'nearley'`
- Replace `const magicCardGrammar = require('./generated/magicCardGrammar')` (and typeLineGrammar) with `import` statements
- Replace `module.exports = { ... }` with named `export` statements
- Add `@typedef` imports referencing types from `./index.d.ts`
- Add `@param` and `@returns` JSDoc annotations to `parseCard`, `parseTypeLine`, `cardToGraphViz`, and `makeUnique`

**Test requirements:**
- Run `npx tsup` — build succeeds with the updated source
- Inspect output files to confirm exports are present

**Integration:** Builds on Step 1's tsup config. The source is now ESM, tsup produces both formats.

**Demo:** `npx tsup` completes without errors; `dist/index.mjs` exports `parseCard`, `parseTypeLine`, `cardToGraphViz`.

---

## Step 3: Update package.json for dual format and GitHub Packages

**Objective:** Update package identity, exports map, file list, build scripts, and publish configuration.

**Implementation guidance:**
- Change `name` to `@oscarhermoso/magic-card-parser`
- Change `version` to `0.4.0`
- Add `"type": "module"`
- Set `main`, `module`, `types`, and `exports` map pointing to `dist/`
- Update `files` to `["dist/**/*", "README.md"]`
- Add `publishConfig.registry` for GitHub Packages
- Update `repository` and `homepage` URLs to `oscarhermoso/magic-card-parser`
- Split build scripts: `build:grammar`, `build:bundle` (tsup + copy index.d.ts), `build` (both), `typecheck`
- Add `prepublishOnly` script

**Test requirements:**
- `npm run build` succeeds (grammar compile + tsup + d.ts copy)
- `dist/` contains `index.mjs`, `index.cjs`, `index.d.ts`
- `npm pack --dry-run` shows only `dist/**` and `README.md`

**Integration:** Builds on Steps 1-2. Package is now correctly configured for dual format publishing.

**Demo:** `npm pack --dry-run` shows the expected file list; `dist/` has all three output files.

---

## Step 4: Update tsconfig.json for ESM and checkJs

**Objective:** Configure TypeScript for ESM module resolution and enable type-checking on JavaScript source.

**Implementation guidance:**
- Change `module` to `ES2020`
- Change `moduleResolution` to `bundler`
- Set `checkJs` to `true`
- Remove `declaration` and `declarationDir` (not emitting via tsc)
- Add `dist` to `exclude`
- Add `src/**/*.js` to `include`

**Test requirements:**
- `npm run typecheck` (`tsc --noEmit`) passes — JSDoc annotations are consistent with `index.d.ts`
- Fix any type errors that arise from enabling `checkJs`

**Integration:** Builds on Step 2's JSDoc annotations. Type-checking validates the annotations are correct.

**Demo:** `npm run typecheck` exits cleanly with no errors.

---

## Step 5: Update tests to ESM imports and verify

**Objective:** Convert test files from `require()` to ESM `import` and verify all tests pass.

**Implementation guidance:**
- In all `__tests__/*.test.ts` files, replace `require('../src/magicCardParser')` with `import { parseCard, parseTypeLine, cardToGraphViz } from '../src/magicCardParser.js'`
- Remove any `// eslint-disable-next-line @typescript-eslint/no-require-imports` comments
- Update vitest.config.ts if needed for ESM compatibility

**Test requirements:**
- `npm test` (`vitest run`) passes — all existing tests pass with ESM imports
- No regressions in parse results

**Integration:** Builds on Steps 2-4. Tests validate that the ESM source produces correct results.

**Demo:** Full test suite passes with `npm test`.

---

## Step 6: Convert utility scripts to ESM

**Objective:** Convert `scripts/*.js` files to ESM syntax so they work with `"type": "module"`.

**Implementation guidance:**
- In each file under `scripts/`, replace `require()` with `import`
- Replace `module.exports` with `export` where applicable
- Update any `__dirname` usage to `import.meta.url` equivalent
- Files: `assessCardParser.js`, `assessCube.js`, `fetchCards.js`, `visualizeCard.js`

**Test requirements:**
- Run one of the scripts (e.g., `node scripts/fetchCards.js`) to confirm it works without "require is not defined" errors

**Integration:** Builds on Step 3's `"type": "module"`. Scripts are dev-only but must work in ESM context.

**Demo:** `node scripts/fetchCards.js` (or similar) runs without module errors.

---

## Step 7: Add GitHub Actions publish workflow

**Objective:** Create CI/CD workflow that publishes to GitHub Packages when a GitHub release is created.

**Implementation guidance:**
- Create `.github/workflows/publish.yml`
- Trigger on `release: types: [published]`
- Permissions: `contents: read`, `packages: write`
- Steps: checkout → setup-node (with registry-url and scope) → `npm ci` → `npm run build` → `npm test` → `npm publish`
- Use `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}`

**Test requirements:**
- Validate workflow YAML syntax (e.g., `actionlint` or manual review)
- Verify the workflow file is well-formed and references correct scripts

**Integration:** Builds on Steps 1-5. The workflow runs the full build+test pipeline before publishing.

**Demo:** `.github/workflows/publish.yml` exists and is valid YAML; dry-run of the build+test pipeline succeeds locally.

---

## Step 8: Update README with installation instructions

**Objective:** Add a section to README.md documenting how consumers install from GitHub Packages.

**Implementation guidance:**
- Add "Installation" section with:
  - `.npmrc` configuration for GitHub Packages registry
  - GitHub PAT requirement (`read:packages` scope)
  - `npm install` command
  - Usage examples for both ESM (`import`) and CJS (`require`)

**Test requirements:**
- Review README renders correctly (headings, code blocks, formatting)

**Integration:** Builds on Step 3's package identity changes. Documents what consumers need to do.

**Demo:** README contains clear installation instructions with both ESM and CJS usage examples.

---

## Step 9: Validate with mtg-cube-simulator

**Objective:** Confirm the conversion fixes the real-world consumer error in the adjacent `mtg-cube-simulator` repo.

**Implementation guidance:**
- In `magic-card-parser`: run `npm run build` to produce `dist/`
- In `mtg-cube-simulator/src/engine/CardParser.ts`:
  - Replace `const magicCardParser = require('magic-card-parser')` with `import { parseCard as mcpParseCard, parseTypeLine as mcpParseTypeLine } from 'magic-card-parser'`
  - Remove the `eslint-disable` comment and intermediate variable assignments
- In `mtg-cube-simulator`: run `npm run dev`
- Confirm no "require is not defined" error
- Confirm card parsing functionality works at runtime

**Test requirements:**
- `npm run dev` in `mtg-cube-simulator` starts without import/require errors
- Card parsing results are correct (spot-check a few cards)

**Integration:** This is the end-to-end validation. Everything from Steps 1-8 feeds into this working.

**Demo:** `mtg-cube-simulator` dev server starts cleanly; card parsing works as expected.
