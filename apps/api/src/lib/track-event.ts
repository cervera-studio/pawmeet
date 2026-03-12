import type { AnalyticsEventMap, AnalyticsEventName } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import { enqueueAnalyticsEvents } from '../jobs/queue.js';

/**
 * Track a server-authoritative analytics event.
 *
 * Call this at tRPC router level AFTER `unwrapResult()`, NOT inside use-cases.
 * Events are enqueued to BullMQ asynchronously — never blocks the response.
 *
 * Server events use platform 'server' to distinguish from client-submitted events.
 * Consent is not required for server-authoritative events (GDPR Art. 6(1)(f)
 * legitimate interest for operational analytics).
 *
 * @example
 * ```ts
 * const match = unwrapResult(await deps.createMatch(input));
 * trackEvent('match_created', ctx.userId, { compatibilityScore: match.score });
 * return match;
 * ```
 */
export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  userId: string | null,
  properties: AnalyticsEventMap[E],
): void {
  enqueueAnalyticsEvents({
    events: [
      {
        clientEventId: `srv_${crypto.randomUUID()}`,
        userId,
        eventName: event,
        properties: properties as Record<string, unknown>,
        clientTimestamp: new Date().toISOString(),
        platform: 'server',
      },
    ],
  }).catch((err) => {
    logger.warn('analytics', `Failed to enqueue event ${event}`, err);
  });
}
