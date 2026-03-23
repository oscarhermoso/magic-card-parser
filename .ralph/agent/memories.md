# Memories

## Patterns

### mem-1774307870-a131
> magic-card-parser uses tsup for dual ESM/CJS bundling. Generated nearley grammars are .cjs files imported with @ts-ignore and bundled by tsup. nearley is externalized. The createRequire banner in tsup.config.ts provides require() compatibility in ESM output for nearley's CJS internals.
<!-- tags: build, tsup, esm | created: 2026-03-23 -->

## Decisions

## Fixes

### mem-1774307864-0389
> nearley generated grammar files use sloppy-mode JS (implicit global variables in postprocessors). When converting to ESM/strict mode, must fix implicit globals (e.g., missing 'let' keyword) and use // @ts-nocheck in generated .cjs files. Grammar files should use .cjs extension for CJS compatibility with 'type: module' projects.
<!-- tags: nearley, esm, grammar | created: 2026-03-23 -->

## Context
