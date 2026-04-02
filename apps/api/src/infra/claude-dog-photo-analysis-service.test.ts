import { describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { ClaudeDogPhotoAnalysisService } from './claude-dog-photo-analysis-service.js';

function buildMockClient(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  };
}

describe('ClaudeDogPhotoAnalysisService', () => {
  it('calls Anthropic API with base64 image and correct model', async () => {
    const response = {
      breed: 'Labrador Retriever',
      breedSecondary: null,
      size: 'large',
      ageEstimate: '2-4 anni',
      confidence: 0.9,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    await service.analyze('base64data', 'image/jpeg');

    expect(client.messages.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: 'image/jpeg',
                  data: 'base64data',
                },
              },
              {
                type: 'text',
                text: expect.stringContaining('Analyze this dog photo') as string,
              },
            ],
          },
        ],
      }),
    );
  });

  it('returns parsed analysis result', async () => {
    const response = {
      breed: 'Pastore Tedesco',
      breedSecondary: 'Husky',
      size: 'large',
      ageEstimate: '3-5 anni',
      confidence: 0.85,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result).toEqual({
      breed: 'Pastore Tedesco',
      breedSecondary: 'Husky',
      size: 'large',
      ageEstimate: '3-5 anni',
      confidence: 0.85,
    });
  });

  it('returns null for not_a_dog response', async () => {
    const client = buildMockClient(JSON.stringify({ error: 'not_a_dog' }));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/png');

    expect(result).toBeNull();
  });

  it('defaults to medium size when invalid size is returned', async () => {
    const response = {
      breed: 'Mixed',
      breedSecondary: null,
      size: 'enormous',
      ageEstimate: null,
      confidence: 0.5,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result?.size).toBe('medium');
  });

  it('clamps confidence to [0, 1] range', async () => {
    const response = {
      breed: 'Poodle',
      size: 'small',
      confidence: 1.5,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result?.confidence).toBe(1);
  });

  it('handles negative confidence by clamping to 0', async () => {
    const response = {
      breed: 'Poodle',
      size: 'small',
      confidence: -0.5,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result?.confidence).toBe(0);
  });

  it('returns null when JSON parsing fails', async () => {
    const client = buildMockClient('not json');
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result).toBeNull();
  });

  it('returns null when response has no text block', async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    };
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result).toBeNull();
  });

  it('handles missing optional fields gracefully', async () => {
    const response = {
      breed: 'Beagle',
      size: 'medium',
      confidence: 0.7,
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeDogPhotoAnalysisService(client as never);

    const result = await service.analyze('base64data', 'image/jpeg');

    expect(result).toEqual({
      breed: 'Beagle',
      breedSecondary: undefined,
      size: 'medium',
      ageEstimate: undefined,
      confidence: 0.7,
    });
  });
});
