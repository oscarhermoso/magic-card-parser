import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/magicCardParser.js' },
  format: ['esm', 'cjs'],
  outDir: 'dist',
  outExtension({ format }) {
    return { js: format === 'esm' ? '.mjs' : '.cjs' };
  },
  clean: true,
  splitting: false,
  sourcemap: true,
  // Bundle generated grammars (local files), externalize nearley (npm dep)
  noExternal: [],
  external: ['nearley'],
  banner({ format }) {
    // Shim require() in ESM for nearley compatibility
    if (format === 'esm') {
      return {
        js: "import {createRequire as __createRequire} from 'module';\nvar require=__createRequire(import.meta.url);",
      };
    }
    return {};
  },
});
