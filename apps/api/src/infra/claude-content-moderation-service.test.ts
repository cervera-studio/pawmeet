import { describe, expect, it, vi } from 'vitest';

import { ClaudeContentModerationService } from './claude-content-moderation-service.js';

function buildMockClient(text: string) {
  return {
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text }],
      }),
    },
  };
}

describe('ClaudeContentModerationService', () => {
  it('calls Anthropic API with image URL and moderation prompt', async () => {
    const client = buildMockClient(JSON.stringify({ safe: true, categories: [] }));
    const service = new ClaudeContentModerationService(client as never);

    await service.analyzeImage('https://cdn.pawmeet.io/photos/dog.jpg');

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
                source: { type: 'url', url: 'https://cdn.pawmeet.io/photos/dog.jpg' },
              },
              {
                type: 'text',
                text: expect.stringContaining('content moderation') as string,
              },
            ],
          },
        ],
      }),
    );
  });

  it('returns safe result when image is safe', async () => {
    const client = buildMockClient(JSON.stringify({ safe: true, categories: [] }));
    const service = new ClaudeContentModerationService(client as never);

    const result = await service.analyzeImage('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result).toEqual({ safe: true, categories: [] });
  });

  it('returns unsafe result with categories', async () => {
    const response = {
      safe: false,
      categories: [
        { name: 'not_a_dog', confidence: 0.95 },
        { name: 'violence', confidence: 0.1 },
      ],
    };
    const client = buildMockClient(JSON.stringify(response));
    const service = new ClaudeContentModerationService(client as never);

    const result = await service.analyzeImage('https://cdn.pawmeet.io/photos/cat.jpg');

    expect(result.safe).toBe(false);
    expect(result.categories).toEqual([
      { name: 'not_a_dog', confidence: 0.95 },
      { name: 'violence', confidence: 0.1 },
    ]);
  });

  it('defaults to safe when JSON parsing fails', async () => {
    const client = buildMockClient('not valid json at all');
    const service = new ClaudeContentModerationService(client as never);

    const result = await service.analyzeImage('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result).toEqual({ safe: true, categories: [] });
  });

  it('defaults to safe when response has no text block', async () => {
    const client = {
      messages: {
        create: vi.fn().mockResolvedValue({ content: [] }),
      },
    };
    const service = new ClaudeContentModerationService(client as never);

    const result = await service.analyzeImage('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result).toEqual({ safe: true, categories: [] });
  });

  it('handles missing categories array in response', async () => {
    const client = buildMockClient(JSON.stringify({ safe: true }));
    const service = new ClaudeContentModerationService(client as never);

    const result = await service.analyzeImage('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result).toEqual({ safe: true, categories: [] });
  });
});
