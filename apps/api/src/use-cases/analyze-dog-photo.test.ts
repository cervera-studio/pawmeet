import { describe, expect, it, vi } from 'vitest';
import type { DogPhotoAnalysisService } from '../ports/dog-photo-analysis-service.js';
import { createAnalyzeDogPhoto } from './analyze-dog-photo.js';

const mockResult = {
  breed: 'Labrador Retriever',
  breedSecondary: undefined,
  size: 'grande' as const,
  ageEstimate: '2-4 anni',
  confidence: 0.92,
};

function mockService(result: typeof mockResult | null): DogPhotoAnalysisService {
  return { analyze: vi.fn().mockResolvedValue(result) };
}

describe('analyzeDogPhoto', () => {
  it('returns analysis result from service', async () => {
    const analyzeDogPhoto = createAnalyzeDogPhoto({
      dogPhotoAnalysisService: mockService(mockResult),
    });

    const result = await analyzeDogPhoto('base64data', 'image/jpeg');

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.analysis.breed).toBe('Labrador Retriever');
      expect(result.data.analysis.size).toBe('grande');
      expect(result.data.analysis.confidence).toBe(0.92);
    }
  });

  it('passes image data to service', async () => {
    const service = mockService(mockResult);
    const analyzeDogPhoto = createAnalyzeDogPhoto({ dogPhotoAnalysisService: service });

    await analyzeDogPhoto('abc123', 'image/png');

    expect(service.analyze).toHaveBeenCalledWith('abc123', 'image/png');
  });

  it('fails when service is not configured', async () => {
    const analyzeDogPhoto = createAnalyzeDogPhoto({ dogPhotoAnalysisService: undefined });

    const result = await analyzeDogPhoto('base64data', 'image/jpeg');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AI_SERVICE_UNAVAILABLE');
    }
  });

  it('fails when service returns null (not a dog)', async () => {
    const analyzeDogPhoto = createAnalyzeDogPhoto({ dogPhotoAnalysisService: mockService(null) });

    const result = await analyzeDogPhoto('base64data', 'image/jpeg');

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('PHOTO_ANALYSIS_FAILED');
    }
  });
});
