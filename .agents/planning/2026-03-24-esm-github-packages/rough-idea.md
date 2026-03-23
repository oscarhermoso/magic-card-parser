# Rough Idea

Convert the magic-card-parser project from CommonJS to ES modules and configure publishing to GitHub Packages (npm registry).

## Current State
- Project uses CommonJS (`module.exports` / `require()`)
- Entry point: `src/magicCardParser.js`
- Type definitions: `src/index.d.ts`
- Build: Nearley grammar compiler outputs CommonJS IIFE-wrapped modules
- Published to npm as `magic-card-parser@0.3.0`
- No GitHub Packages configuration

## Desired State
- ES module format (`export` / `import`)
- Published to GitHub Packages npm registry
- Existing functionality preserved
