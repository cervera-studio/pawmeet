import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsService } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';

/** Silent analytics service for development — logs to console in __DEV__ */
export function createNoOpAnalyticsService(): AnalyticsService {
  return {
    identify(userId: string) {
      if (__DEV__) logger.debug('NoOpAnalytics', 'identify', userId);
    },
    track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) {
      if (__DEV__) logger.debug('NoOpAnalytics', `track ${event}`, properties);
    },
    reset() {
      if (__DEV__) logger.debug('NoOpAnalytics', 'reset');
    },
    optIn() {
      /* noop */
    },
    optOut() {
      /* noop */
    },
    async flush() {
      /* noop */
    },
  };
}
