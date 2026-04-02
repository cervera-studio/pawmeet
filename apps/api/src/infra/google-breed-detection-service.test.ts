import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { GoogleBreedDetectionService } from './google-breed-detection-service.js';

describe('GoogleBreedDetectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('GOOGLE_VISION_API_KEY', 'test-vision-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when GOOGLE_VISION_API_KEY is not set', () => {
    vi.stubEnv('GOOGLE_VISION_API_KEY', '');
    expect(() => new GoogleBreedDetectionService()).toThrow(
      'GOOGLE_VISION_API_KEY environment variable is required',
    );
  });

  describe('URL validation', () => {
    it('rejects non-HTTPS URLs', async () => {
      const service = new GoogleBreedDetectionService();
      await expect(service.detectBreed('http://example.com/dog.jpg')).rejects.toThrow(
        'Image URL must use HTTPS',
      );
    });

    it('rejects URLs from disallowed hosts', async () => {
      const service = new GoogleBreedDetectionService();
      await expect(service.detectBreed('https://evil.com/dog.jpg')).rejects.toThrow(
        'Image URL not from allowed storage origin',
      );
    });

    it('rejects invalid URLs', async () => {
      const service = new GoogleBreedDetectionService();
      await expect(service.detectBreed('not-a-url')).rejects.toThrow('Invalid image URL');
    });

    it('accepts R2 storage URLs', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ responses: [{ labelAnnotations: [] }] }), { status: 200 }),
      );

      const service = new GoogleBreedDetectionService();
      const result = await service.detectBreed(
        'https://my-bucket.r2.cloudflarestorage.com/dog.jpg',
      );
      expect(result.breeds).toEqual([]);
    });

    it('accepts cdn.pawmeet.io URLs', async () => {
      mockFetch.mockResolvedValue(
        new Response(JSON.stringify({ responses: [{ labelAnnotations: [] }] }), { status: 200 }),
      );

      const service = new GoogleBreedDetectionService();
      await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');
      expect(mockFetch).toHaveBeenCalledOnce();
    });
  });

  it('sends correct request to Vision API', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ responses: [{ labelAnnotations: [] }] }), { status: 200 }),
    );

    const service = new GoogleBreedDetectionService();
    await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(url).toContain('vision.googleapis.com');
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toEqual({
      requests: [
        {
          image: { source: { imageUri: 'https://cdn.pawmeet.io/photos/dog.jpg' } },
          features: [{ type: 'LABEL_DETECTION', maxResults: 10 }],
        },
      ],
    });
  });

  it('returns breed labels, filtering out generic terms', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            {
              labelAnnotations: [
                { description: 'Dog', score: 0.99 },
                { description: 'Mammal', score: 0.98 },
                { description: 'Golden Retriever', score: 0.92 },
                { description: 'Companion dog', score: 0.85 },
                { description: 'Labrador Retriever', score: 0.7 },
              ],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const service = new GoogleBreedDetectionService();
    const result = await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result.breeds).toEqual([
      { name: 'Golden Retriever', confidence: 0.92 },
      { name: 'Labrador Retriever', confidence: 0.7 },
    ]);
  });

  it('filters out labels with score <= 0.5', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          responses: [
            {
              labelAnnotations: [{ description: 'Poodle', score: 0.4 }],
            },
          ],
        }),
        { status: 200 },
      ),
    );

    const service = new GoogleBreedDetectionService();
    const result = await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result.breeds).toEqual([]);
  });

  it('returns empty breeds on API error', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

    const service = new GoogleBreedDetectionService();
    const result = await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result.breeds).toEqual([]);
  });

  it('handles missing labelAnnotations gracefully', async () => {
    mockFetch.mockResolvedValue(new Response(JSON.stringify({ responses: [{}] }), { status: 200 }));

    const service = new GoogleBreedDetectionService();
    const result = await service.detectBreed('https://cdn.pawmeet.io/photos/dog.jpg');

    expect(result.breeds).toEqual([]);
  });
});
