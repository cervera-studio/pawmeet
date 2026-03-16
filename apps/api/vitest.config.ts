import { defineConfig, mergeConfig } from 'vitest/config';
import baseConfig from '../../tooling/vitest/node.js';

export default mergeConfig(
  baseConfig,
  defineConfig({
    test: {
      setupFiles: ['./src/test-utils/setup-env.ts', './src/test-utils/setup-mocks.ts'],
    },
  }),
);
