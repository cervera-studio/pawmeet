import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { PerspectiveToxicityService } from './perspective-toxicity-service.js';

describe('PerspectiveToxicityService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PERSPECTIVE_API_KEY', 'test-api-key');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when PERSPECTIVE_API_KEY is not set', () => {
    vi.stubEnv('PERSPECTIVE_API_KEY', '');
    expect(() => new PerspectiveToxicityService()).toThrow(
      'PERSPECTIVE_API_KEY environment variable is required',
    );
  });

  it('sends correct request to Perspective API', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          attributeScores: {
            TOXICITY: { summaryScore: { value: 0.1 } },
            SEVERE_TOXICITY: { summaryScore: { value: 0.05 } },
            INSULT: { summaryScore: { value: 0.2 } },
            PROFANITY: { summaryScore: { value: 0.15 } },
            THREAT: { summaryScore: { value: 0.0 } },
          },
        }),
        { status: 200 },
      ),
    );

    const service = new PerspectiveToxicityService();
    await service.analyzeText('ciao mondo', 'it');

    const [url, options] = mockFetch.mock.calls[0] ?? [];
    expect(url).toContain('commentanalyzer.googleapis.com');
    const body = JSON.parse((options as RequestInit).body as string) as Record<string, unknown>;
    expect(body).toEqual({
      comment: { text: 'ciao mondo' },
      languages: ['it'],
      requestedAttributes: {
        TOXICITY: {},
        SEVERE_TOXICITY: {},
        INSULT: {},
        PROFANITY: {},
        THREAT: {},
      },
    });
  });

  it('returns non-toxic result for low scores', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          attributeScores: {
            TOXICITY: { summaryScore: { value: 0.1 } },
            SEVERE_TOXICITY: { summaryScore: { value: 0.05 } },
            INSULT: { summaryScore: { value: 0.2 } },
            PROFANITY: { summaryScore: { value: 0.15 } },
            THREAT: { summaryScore: { value: 0.0 } },
          },
        }),
        { status: 200 },
      ),
    );

    const service = new PerspectiveToxicityService();
    const result = await service.analyzeText('ciao mondo');

    expect(result.toxic).toBe(false);
    expect(result.scores.toxicity).toBe(0.1);
    expect(result.scores.severeToxicity).toBe(0.05);
  });

  it('returns toxic=true when toxicity score >= 0.7', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          attributeScores: {
            TOXICITY: { summaryScore: { value: 0.85 } },
            SEVERE_TOXICITY: { summaryScore: { value: 0.3 } },
            INSULT: { summaryScore: { value: 0.6 } },
            PROFANITY: { summaryScore: { value: 0.4 } },
            THREAT: { summaryScore: { value: 0.1 } },
          },
        }),
        { status: 200 },
      ),
    );

    const service = new PerspectiveToxicityService();
    const result = await service.analyzeText('toxic message');

    expect(result.toxic).toBe(true);
    expect(result.scores.toxicity).toBe(0.85);
  });

  it('returns toxic=true when severeToxicity >= 0.7', async () => {
    mockFetch.mockResolvedValue(
      new Response(
        JSON.stringify({
          attributeScores: {
            TOXICITY: { summaryScore: { value: 0.5 } },
            SEVERE_TOXICITY: { summaryScore: { value: 0.9 } },
            INSULT: { summaryScore: { value: 0.2 } },
            PROFANITY: { summaryScore: { value: 0.1 } },
            THREAT: { summaryScore: { value: 0.0 } },
          },
        }),
        { status: 200 },
      ),
    );

    const service = new PerspectiveToxicityService();
    const result = await service.analyzeText('severely toxic');

    expect(result.toxic).toBe(true);
  });

  it('returns safe fallback on API error', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 500 }));

    const service = new PerspectiveToxicityService();
    const result = await service.analyzeText('test');

    expect(result.toxic).toBe(false);
    expect(result.scores).toEqual({
      toxicity: 0,
      severeToxicity: 0,
      insult: 0,
      profanity: 0,
      threat: 0,
    });
  });
});
