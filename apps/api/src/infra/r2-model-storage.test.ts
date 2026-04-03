import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockSend = vi.fn();
vi.mock('../lib/r2.js', () => ({
  r2: { send: mockSend },
}));

import type { ModelArtifacts } from './r2-model-storage.js';
import {
  downloadFeatureSchema,
  downloadMetrics,
  downloadModel,
  uploadModelArtifacts,
} from './r2-model-storage.js';

describe('r2-model-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('version validation', () => {
    it('rejects versions with path traversal characters', async () => {
      await expect(downloadModel('../../etc/passwd')).rejects.toThrow(
        'Invalid model version format',
      );
    });

    it('rejects versions with spaces', async () => {
      await expect(downloadModel('v1 malicious')).rejects.toThrow('Invalid model version format');
    });

    it('rejects versions with slashes', async () => {
      await expect(downloadFeatureSchema('v1/evil')).rejects.toThrow(
        'Invalid model version format',
      );
    });

    it('rejects empty version string', async () => {
      await expect(downloadMetrics('')).rejects.toThrow('Invalid model version format');
    });

    it('accepts valid version formats', async () => {
      const mockBody = {
        [Symbol.asyncIterator]: async function* () {
          yield Buffer.from('model-data');
        },
      };
      mockSend.mockResolvedValue({ Body: mockBody });

      // Should not throw for valid versions
      await expect(downloadModel('v1.0.0')).resolves.toBeDefined();
      await expect(downloadModel('model-2024_01')).resolves.toBeDefined();
    });
  });

  describe('uploadModelArtifacts', () => {
    it('uploads model, feature schema, and metrics in parallel', async () => {
      mockSend.mockResolvedValue({});
      const artifacts = {
        model: Buffer.from('onnx-bytes'),
        featureSchema: ['feature_a', 'feature_b'],
        metrics: { rmse: 0.1, auc: 0.95, precision: 0.9, recall: 0.85 },
      } satisfies ModelArtifacts;

      await uploadModelArtifacts('v1.0.0', artifacts);

      expect(mockSend).toHaveBeenCalledTimes(3);
    });

    it('rejects invalid version on upload', async () => {
      const artifacts = {
        model: Buffer.from('data'),
        featureSchema: [],
        metrics: { rmse: 0, auc: 0, precision: 0, recall: 0 },
      } satisfies ModelArtifacts;

      await expect(uploadModelArtifacts('../bad', artifacts)).rejects.toThrow(
        'Invalid model version format',
      );
    });
  });

  describe('downloadModel', () => {
    it('throws when R2 response body is empty', async () => {
      mockSend.mockResolvedValue({ Body: null });

      await expect(downloadModel('v1.0.0')).rejects.toThrow('Empty response for model v1.0.0');
    });

    it('returns the model buffer from R2', async () => {
      const data = Buffer.from('onnx-model-content');
      const mockBody = {
        [Symbol.asyncIterator]: async function* () {
          yield data;
        },
      };
      mockSend.mockResolvedValue({ Body: mockBody });

      const result = await downloadModel('v1.0.0');
      expect(result).toEqual(data);
    });
  });

  describe('downloadFeatureSchema', () => {
    it('parses and returns a valid feature schema', async () => {
      const schema = ['energy_level', 'size_category', 'distance_km'];
      mockSend.mockResolvedValue({
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(schema)) },
      });

      const result = await downloadFeatureSchema('v2.0.0');
      expect(result).toEqual(schema);
    });

    it('throws on empty body', async () => {
      mockSend.mockResolvedValue({ Body: null });

      await expect(downloadFeatureSchema('v1')).rejects.toThrow(
        'Empty response for feature schema',
      );
    });
  });

  describe('downloadMetrics', () => {
    it('parses and returns valid metrics', async () => {
      const metrics = { rmse: 0.12, auc: 0.93, precision: 0.88, recall: 0.82 };
      mockSend.mockResolvedValue({
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify(metrics)) },
      });

      const result = await downloadMetrics('v3.0');
      expect(result).toEqual(metrics);
    });

    it('rejects metrics with invalid shape (Zod validation)', async () => {
      mockSend.mockResolvedValue({
        Body: { transformToString: vi.fn().mockResolvedValue(JSON.stringify({ bad: 'data' })) },
      });

      await expect(downloadMetrics('v1')).rejects.toThrow();
    });
  });
});
