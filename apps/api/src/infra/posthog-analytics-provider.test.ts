import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockCapture = vi.fn();
const mockFlush = vi.fn().mockResolvedValue(undefined);
const mockShutdown = vi.fn().mockResolvedValue(undefined);

vi.mock('posthog-node', () => ({
  PostHog: class {
    capture = mockCapture;
    flush = mockFlush;
    shutdown = mockShutdown;
    constructor(_apiKey: string, _options?: unknown) {}
  },
}));

vi.mock('../lib/pseudonymize.js', () => ({
  pseudonymizeUserId: vi.fn((id: string) => `pseudo-${id}`),
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import type { AnalyticsProviderEvent } from '../ports/analytics-provider.js';
import { PostHogAnalyticsProvider } from './posthog-analytics-provider.js';

describe('PostHogAnalyticsProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ results: [{ id: 42 }] }), { status: 200 }),
    );
  });

  it('has name "posthog"', () => {
    const provider = new PostHogAnalyticsProvider('api-key');
    expect(provider.name).toBe('posthog');
  });

  describe('capture', () => {
    it('calls client.capture for each event and flushes', async () => {
      const provider = new PostHogAnalyticsProvider('api-key');

      const events = [
        {
          distinctId: 'user-1',
          event: 'test_event',
          properties: { foo: 'bar' },
          timestamp: '2026-01-01T00:00:00Z',
          uuid: 'evt-1',
        },
        {
          distinctId: 'user-2',
          event: 'another_event',
          properties: {},
          timestamp: '2026-01-02T00:00:00Z',
          uuid: 'evt-2',
        },
      ] satisfies AnalyticsProviderEvent[];

      await provider.capture(events);

      expect(mockCapture).toHaveBeenCalledTimes(2);
      expect(mockCapture).toHaveBeenCalledWith({
        distinctId: 'user-1',
        event: 'test_event',
        properties: { foo: 'bar', $lib: 'pawmeet-server' },
        timestamp: new Date('2026-01-01T00:00:00Z'),
        uuid: 'evt-1',
      });
      expect(mockFlush).toHaveBeenCalledOnce();
    });

    it('handles empty events array', async () => {
      const provider = new PostHogAnalyticsProvider('api-key');
      await provider.capture([]);
      expect(mockCapture).not.toHaveBeenCalled();
      expect(mockFlush).toHaveBeenCalledOnce();
    });
  });

  describe('deletePerson', () => {
    it('skips when personalApiKey is not configured', async () => {
      const provider = new PostHogAnalyticsProvider('api-key');
      await provider.deletePerson('user-123');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('looks up person and deletes when found', async () => {
      mockFetch
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ results: [{ id: 99 }] }), { status: 200 }),
        )
        .mockResolvedValueOnce(new Response(null, { status: 200 }));

      const provider = new PostHogAnalyticsProvider(
        'api-key',
        'https://eu.i.posthog.com',
        'personal-key',
        'proj-1',
      );

      await provider.deletePerson('user-123');

      expect(mockFetch).toHaveBeenCalledTimes(2);

      // Lookup call
      const lookupUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(lookupUrl).toContain('/api/projects/proj-1/persons/');
      expect(lookupUrl).toContain('distinct_id=pseudo-user-123');

      // Delete call
      const deleteUrl = mockFetch.mock.calls[1]?.[0] as string;
      expect(deleteUrl).toContain('/api/projects/proj-1/persons/99/delete/');
    });

    it('does not call delete when person is not found', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ results: [] }), { status: 200 }),
      );

      const provider = new PostHogAnalyticsProvider(
        'api-key',
        'https://eu.i.posthog.com',
        'personal-key',
        'proj-1',
      );

      await provider.deletePerson('user-123');

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('does not throw when lookup fails', async () => {
      mockFetch.mockResolvedValueOnce(new Response(null, { status: 500 }));

      const provider = new PostHogAnalyticsProvider(
        'api-key',
        'https://eu.i.posthog.com',
        'personal-key',
        'proj-1',
      );

      await expect(provider.deletePerson('user-123')).resolves.toBeUndefined();
    });

    it('does not throw when fetch rejects', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const provider = new PostHogAnalyticsProvider(
        'api-key',
        'https://eu.i.posthog.com',
        'personal-key',
        'proj-1',
      );

      await expect(provider.deletePerson('user-123')).resolves.toBeUndefined();
    });
  });

  describe('shutdown', () => {
    it('calls client.shutdown', async () => {
      const provider = new PostHogAnalyticsProvider('api-key');
      await provider.shutdown();
      expect(mockShutdown).toHaveBeenCalledOnce();
    });
  });

  describe('toProviderEvents (static)', () => {
    it('maps raw events with pseudonymized IDs', () => {
      const raw = [
        {
          clientEventId: 'evt-1',
          userId: 'user-1',
          eventName: 'walk_started',
          properties: { distance: 100 },
          clientTimestamp: '2026-01-01T00:00:00Z',
          platform: 'ios',
        },
      ];

      const result = PostHogAnalyticsProvider.toProviderEvents(raw);

      expect(result).toEqual([
        {
          distinctId: 'pseudo-user-1',
          event: 'walk_started',
          properties: { distance: 100, platform: 'ios' },
          timestamp: '2026-01-01T00:00:00Z',
          uuid: 'evt-1',
        },
      ]);
    });

    it('filters out events with null userId', () => {
      const raw = [
        {
          clientEventId: 'evt-1',
          userId: null,
          eventName: 'anonymous_event',
          properties: null,
          clientTimestamp: '2026-01-01T00:00:00Z',
          platform: 'android',
        },
      ];

      const result = PostHogAnalyticsProvider.toProviderEvents(raw);
      expect(result).toEqual([]);
    });
  });
});
