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
});
