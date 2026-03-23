# Idea Honing

Requirements clarification Q&A for ESM conversion and GitHub Packages publishing.

---

## Q1: Scope of the package name for GitHub Packages

GitHub Packages requires npm packages to be scoped under your GitHub user or org (e.g., `@oscarhermoso/magic-card-parser`). The current package name is unscoped (`magic-card-parser`). What scoped name would you like to use?

For example: `@oscarhermoso/magic-card-parser`

**A1:** `@oscarhermoso/magic-card-parser`

---

## Q2: Do you need to maintain CommonJS compatibility?

Some consumers may still use `require()`. You have a few options:

- **ESM only** — simplest, only `import` supported
- **Dual (ESM + CJS)** — ship both formats via package.json `exports` map, broader compatibility but more build complexity

Which do you prefer?

**A2:** Dual (ESM + CJS) — ship both formats via package.json `exports` map.

---

## Q3: Build tooling for dual output

Currently the project has no bundler — just a shell script that compiles Nearley grammars. To produce both ESM and CJS output, we'll need a build step. Some options:

- **tsup** — zero-config bundler built on esbuild, handles dual output easily, very popular for library publishing
- **Rollup** — more configurable, well-established for libraries
- **esbuild directly** — fast, but requires more manual config for dual output
- **tsc only** — use TypeScript compiler with two tsconfig files (one for ESM, one for CJS)

Do you have a preference, or should I recommend one?

**A3:** tsup — zero-config bundler built on esbuild for dual ESM/CJS output.

---

## Q4: Publishing workflow

How would you like publishing to work?

- **Manual** — run `npm publish` locally when you want to release
- **CI/CD via GitHub Actions** — automatically publish on git tag or GitHub release
- **Both** — CI/CD as primary, with manual as fallback

**A4:** CI/CD via GitHub Actions — automatically publish to GitHub Packages when a GitHub release is created.

---

## Q5: Source language conversion

Currently the main source file (`src/magicCardParser.js`) is plain JavaScript with a separate `index.d.ts` for types. Would you like to:

- **Keep as JavaScript** — just convert `module.exports`/`require` to `export`/`import`, let tsup handle the rest
- **Convert to TypeScript** — merge the type definitions into the source, get full type-checking during development

**A5:** Keep as JavaScript with JSDoc type annotations, type-checked by TypeScript (`checkJs: true`). No `.ts` source files — types live in JSDoc comments and the existing `index.d.ts`.

---

## Q6: GitHub repository

The current `package.json` points to `ruler501/magic-card-parser`. For GitHub Packages under `@oscarhermoso`, the package needs to be published from a repo under your account. Is the repo already at `oscarhermoso/magic-card-parser`, or does it need to be updated?

**A6:** Repo is already forked to `oscarhermoso/magic-card-parser`. Package.json repository URL needs to be updated to reflect this.

---

## Q7: Version number

Current version is `0.3.0`. Since this is a significant change (ESM conversion, new scope, new registry), would you like to:

- **Bump to `1.0.0`** — signal a stable public release
- **Bump to `0.4.0`** — minor bump, treat as continued pre-1.0 work
- **Keep `0.3.0`** — first publish under the new scope starts fresh

**A7:** Bump to `0.4.0` — minor bump, continued pre-1.0 work.

---

## Q8: Nearley generated grammar files

The Nearley compiler currently outputs CommonJS IIFE-wrapped modules (`src/generated/*.js`). These are `require()`'d by the main parser. For ESM conversion, we'll need to handle these. Options:

- **Modify the build script** to output ESM-compatible generated files
- **Let tsup bundle them** — keep the generated files as-is and let tsup resolve the `require()` calls during bundling
- **Import them dynamically** with `createRequire` as a compatibility shim

The simplest approach is likely to let tsup handle it since it can bundle CommonJS dependencies. Does that sound right, or do you have a preference?

**A8:** Let tsup bundle the CommonJS generated grammar files — keep Nearley output as-is, tsup resolves `require()` during bundling.

---

## Q9: Scripts directory

There are several utility scripts in `scripts/` (`assessCardParser.js`, `fetchCards.js`, etc.) that also use `require()`. Should these be:

- **Converted to ESM** as part of this work
- **Left as-is** — they're dev/utility scripts, not part of the published package
- **Excluded from scope** entirely

**A9:** Convert scripts to ESM for consistency, since the project will have `"type": "module"` in package.json and they'd break otherwise. Low effort since they're simple files.
