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
  private host: string;
  private personalApiKey: string | undefined;
  private projectId: string | undefined;

  constructor(
    apiKey: string,
    host = 'https://eu.i.posthog.com',
    personalApiKey?: string,
    projectId?: string,
  ) {
    this.client = new PostHog(apiKey, { host, flushAt: 50, flushInterval: 5000 });
    this.host = host;
    this.personalApiKey = personalApiKey;
    this.projectId = projectId;
  }

  async capture(events: readonly AnalyticsProviderEvent[]): Promise<void> {
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

  async deletePerson(userId: string): Promise<void> {
    if (!(this.personalApiKey && this.projectId)) {
      logger.warn(
        'PostHogAnalyticsProvider',
        'Cannot delete person: POSTHOG_PERSONAL_API_KEY or POSTHOG_PROJECT_ID not configured',
      );
      return;
    }

    const distinctId = pseudonymizeUserId(userId);

    try {
      const res = await fetch(
        `${this.host}/api/projects/${this.projectId}/persons/?distinct_id=${encodeURIComponent(distinctId)}`,
        { headers: { Authorization: `Bearer ${this.personalApiKey}` } },
      );

      if (!res.ok) {
        logger.warn('PostHogAnalyticsProvider', `Person lookup failed: ${res.status}`);
        return;
      }

      const body = (await res.json()) as { results?: Array<{ id: number }> };
      const personId = body.results?.[0]?.id;
      if (!personId) {
        logger.debug('PostHogAnalyticsProvider', `No person found for distinctId ${distinctId}`);
        return;
      }

      const deleteRes = await fetch(
        `${this.host}/api/projects/${this.projectId}/persons/${personId}/delete/`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${this.personalApiKey}` },
        },
      );

      if (deleteRes.ok) {
        logger.info('PostHogAnalyticsProvider', `Deleted person ${personId} for user ${userId}`);
      } else {
        logger.warn('PostHogAnalyticsProvider', `Person delete failed: ${deleteRes.status}`);
      }
    } catch (err) {
      logger.warn('PostHogAnalyticsProvider', 'Failed to delete PostHog person', err);
    }
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
        distinctId: pseudonymizeUserId(e.userId ?? ''),
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
