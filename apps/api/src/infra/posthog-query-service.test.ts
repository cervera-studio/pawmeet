import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { PostHogQueryService } from './posthog-query-service.js';

describe('PostHogQueryService', () => {
  const HOST = 'https://ph.example.com';
  const API_KEY = 'phx_test-key';
  const PROJECT_ID = '42';

  let service: PostHogQueryService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PostHogQueryService(HOST, API_KEY, PROJECT_ID);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  describe('getDauMauMetrics', () => {
    it('returns DAU, MAU, and time series from PostHog', async () => {
      // Three parallel queries: dauToday, mauCurrent, timeSeries
      mockFetch
        .mockResolvedValueOnce(jsonResponse({ results: [[150]] }))
        .mockResolvedValueOnce(jsonResponse({ results: [[3200]] }))
        .mockResolvedValueOnce(
          jsonResponse({
            results: [
              ['2025-06-01', 120],
              ['2025-06-02', 140],
            ],
          }),
        );

      const metrics = await service.getDauMauMetrics(30);

      expect(metrics.dauToday).toBe(150);
      expect(metrics.mauCurrent).toBe(3200);
      expect(metrics.dauTimeSeries).toEqual([
        { date: '2025-06-01', count: 120 },
        { date: '2025-06-02', count: 140 },
      ]);
    });

    it('sends correct authorization header and project ID', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ results: [[0]] }));

      await service.getDauMauMetrics();

      const expectedUrl = `${HOST}/api/projects/${PROJECT_ID}/query`;
      expect(mockFetch).toHaveBeenCalledWith(
        expectedUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: `Bearer ${API_KEY}`,
            'Content-Type': 'application/json',
          }),
        }),
      );
    });

    it('sends HogQLQuery kind in request body', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ results: [[0]] }));

      await service.getDauMauMetrics();

      const firstCallBody = JSON.parse(mockFetch.mock.calls[0][1].body as string) as {
        query: { kind: string; query: string };
      };
      expect(firstCallBody.query.kind).toBe('HogQLQuery');
    });
  });

  describe('error handling', () => {
    it('returns 0 for scalar queries when API returns non-OK status', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ error: 'Unauthorized' }, 401));

      const metrics = await service.getDauMauMetrics();

      expect(metrics.dauToday).toBe(0);
      expect(metrics.mauCurrent).toBe(0);
      expect(metrics.dauTimeSeries).toEqual([]);
    });

    it('returns defaults when fetch throws', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const metrics = await service.getDauMauMetrics();

      expect(metrics.dauToday).toBe(0);
      expect(metrics.mauCurrent).toBe(0);
      expect(metrics.dauTimeSeries).toEqual([]);
    });

    it('returns 0 when results array is empty', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ results: [] }));

      const metrics = await service.getDauMauMetrics();

      expect(metrics.dauToday).toBe(0);
    });
  });
});
