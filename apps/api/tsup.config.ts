import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  // Bundle all dependencies into the output
  noExternal: [/.*/],
  // Except bullmq (native optional dep: msgpackr-extract)
  external: ['bullmq'],
  splitting: true,
  clean: true,
  // Shim require() for CJS packages that use dynamic require of Node built-ins
  banner: {
    js: "import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
  },
});
