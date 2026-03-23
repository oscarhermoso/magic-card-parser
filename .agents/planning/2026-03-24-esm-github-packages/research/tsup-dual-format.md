# tsup Dual ESM/CJS Configuration

## Key Findings

### Configuration
- `format: ['esm', 'cjs']` for dual output
- `dts: true` for type declaration generation
- Use `outExtension` to control file extensions (`.mjs` / `.cjs`)
- `clean: true` to remove previous build output

### Handling CommonJS Dependencies (nearley)
- By default, tsup externalizes `dependencies` — nearley would stay external
- If bundling CJS code into ESM, tsup can inject a `createRequire` shim via `banner`
- `noExternal` option forces specific modules to be bundled

### Package.json Exports Map
```json
{
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.mjs",
      "require": "./dist/index.cjs"
    }
  }
}
```
- `types` must appear first in the exports object

### JSDoc + tsup
- tsup can bundle `.js` files with JSDoc annotations
- For type declarations from JSDoc, may need a separate `tsc --emitDeclarationOnly` step
- Combine tsup for bundling with tsc for `.d.ts` generation

### Validation Tools
- `npx @arethetypeswrong/cli --pack .` — checks type resolution
- `npx publint` — validates package.json exports
