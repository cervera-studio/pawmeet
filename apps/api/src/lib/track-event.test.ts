import { describe, expect, it, vi } from 'vitest';

const { mockEnqueue } = vi.hoisted(() => ({
  mockEnqueue: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../jobs/queues/index.js', () => ({
  enqueueAnalyticsEvents: mockEnqueue,
}));

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { trackEvent } from './track-event.js';

describe('track-event', () => {
  describe('trackEvent', () => {
    it('enqueues an analytics event with correct structure', () => {
      trackEvent('match_created' as never, 'user-1', { compatibilityScore: 85 } as never);

      expect(mockEnqueue).toHaveBeenCalledWith({
        events: [
          expect.objectContaining({
            userId: 'user-1',
            eventName: 'match_created',
            properties: { compatibilityScore: 85 },
            platform: 'server',
          }),
        ],
      });
    });

    it('generates a server-prefixed clientEventId', () => {
      trackEvent('match_created' as never, 'user-1', {} as never);

      const call = mockEnqueue.mock.calls.at(-1)?.[0];
      const event = call?.events[0];
      expect(event?.clientEventId).toMatch(/^srv_/);
    });

    it('includes ISO timestamp', () => {
      trackEvent('match_created' as never, null, {} as never);

      const call = mockEnqueue.mock.calls.at(-1)?.[0];
      const event = call?.events[0];
      expect(event?.clientTimestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it('handles null userId', () => {
      trackEvent('match_created' as never, null, {} as never);

      const call = mockEnqueue.mock.calls.at(-1)?.[0];
      const event = call?.events[0];
      expect(event?.userId).toBeNull();
    });

    it('does not throw when enqueue fails', () => {
      mockEnqueue.mockRejectedValueOnce(new Error('Queue down'));
      expect(() => trackEvent('match_created' as never, 'u1', {} as never)).not.toThrow();
    });
  });
});
