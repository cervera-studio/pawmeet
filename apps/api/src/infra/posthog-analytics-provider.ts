import { logger } from '@pawmeet/utils';
import { PostHog } from 'posthog-node';
import { pseudonymizeUserId } from '../lib/pseudonymize.js';
import type { AnalyticsProvider, AnalyticsProviderEvent } from '../ports/analytics-provider.js';

/**
 * Forwards analytics events to PostHog Cloud EU.
 *
 * Used as a secondary sink in the analytics worker (Neon is source of truth).
 * All errors are caught internally — this provider never throws.
 */
export class PostHogAnalyticsProvider implements AnalyticsProvider {
  readonly name = 'posthog';
  private client: PostHog;

  constructor(apiKey: string, host = 'https://eu.i.posthog.com') {
    this.client = new PostHog(apiKey, { host, flushAt: 50, flushInterval: 5000 });
  }

  async capture(events: ReadonlyArray<AnalyticsProviderEvent>): Promise<void> {
    for (const event of events) {
      this.client.capture({
        distinctId: event.distinctId,
        event: event.event,
        properties: { ...event.properties, $lib: 'pawmeet-server' },
        timestamp: new Date(event.timestamp),
        uuid: event.uuid,
      });
    }

    await this.client.flush();
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
    logger.info('PostHogAnalyticsProvider', 'Shutdown complete');
  }

  /**
   * Map raw analytics job events to provider events with pseudonymized IDs.
   * Convenience helper so the worker doesn't need to know about pseudonymization.
   */
  static toProviderEvents(
    events: ReadonlyArray<{
      clientEventId: string;
      userId: string | null;
      eventName: string;
      properties?: Record<string, unknown> | null;
      clientTimestamp: string;
      platform: string;
    }>,
  ): AnalyticsProviderEvent[] {
    return events
      .filter((e) => e.userId != null)
      .map((e) => ({
        distinctId: pseudonymizeUserId(e.userId!),
        event: e.eventName,
        properties: {
          ...(e.properties ?? {}),
          platform: e.platform,
        },
        timestamp: e.clientTimestamp,
        uuid: e.clientEventId,
      }));
  }
}
