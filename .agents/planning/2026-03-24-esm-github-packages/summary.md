# Project Summary: ESM Conversion & GitHub Packages Publishing

## Directory Structure

```
.agents/planning/2026-03-24-esm-github-packages/
├── rough-idea.md
├── idea-honing.md
├── research/
│   ├── tsup-dual-format.md
│   ├── github-packages.md
│   ├── nearley-esm.md
│   └── jsdoc-checkjs.md
├── design/
│   └── detailed-design.md
├── implementation/
│   └── plan.md
└── summary.md
```

## Key Design Elements

- Dual ESM/CJS output via tsup with `exports` map
- `@oscarhermoso/magic-card-parser@0.4.0` scoped package
- JSDoc annotations with TypeScript `checkJs` for type safety
- GitHub Actions CI/CD publishing on release to GitHub Packages
- nearley kept as external dep, generated grammars bundled by tsup
- `createRequire` shim for nearley CJS compatibility in ESM output

## Implementation Approach

9 incremental steps from build tooling setup through end-to-end validation:

1. Install tsup and configure dual-format build
2. Convert source to ESM with JSDoc annotations
3. Update package.json (identity, exports, scripts, publishConfig)
4. Update tsconfig.json (ESM module, checkJs)
5. Update tests to ESM imports and verify passing
6. Convert utility scripts to ESM
7. Add GitHub Actions publish workflow
8. Update README with installation instructions
9. Validate with mtg-cube-simulator (confirm `npm run dev` works)

## Next Steps

1. Review the detailed design: `.agents/planning/2026-03-24-esm-github-packages/design/detailed-design.md`
2. Follow the implementation checklist: `.agents/planning/2026-03-24-esm-github-packages/implementation/plan.md`
3. Begin implementation with Step 1 (install tsup)

## Implementation Handoff

To start implementation, run one of:
- `ralph run --config presets/pdd-to-code-assist.yml --prompt "<task>"`
- `ralph run -c ralph.yml -H builtin:pdd-to-code-assist -p "<task>"`
