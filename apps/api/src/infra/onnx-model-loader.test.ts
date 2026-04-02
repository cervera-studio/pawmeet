import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../lib/redis.js', () => ({
  redis: { get: vi.fn() },
}));

vi.mock('../lib/r2.js', () => ({
  r2: { send: vi.fn() },
}));

vi.mock('node:fs', () => ({
  default: { existsSync: vi.fn(), mkdirSync: vi.fn(), writeFileSync: vi.fn() },
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

import { OnnxModelLoader } from './onnx-model-loader.js';

describe('OnnxModelLoader', () => {
  let loader: OnnxModelLoader;

  beforeEach(() => {
    vi.clearAllMocks();
    loader = new OnnxModelLoader();
  });

  describe('initial state', () => {
    it('is not ready before initialization', () => {
      expect(loader.isReady()).toBe(false);
    });

    it('has null version before initialization', () => {
      expect(loader.getVersion()).toBeNull();
    });
  });

  describe('predict', () => {
    it('throws when model is not loaded', async () => {
      await expect(loader.predict([1, 2, 3])).rejects.toThrow('Model not loaded');
    });
  });

  describe('shutdown', () => {
    it('clears the session on shutdown', async () => {
      await loader.shutdown();
      expect(loader.isReady()).toBe(false);
    });
  });
});
