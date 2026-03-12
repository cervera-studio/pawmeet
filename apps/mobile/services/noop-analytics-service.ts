import type { AnalyticsEventMap, AnalyticsEventName, AnalyticsService } from '@pawmeet/types';

/** Silent analytics service for development — logs to console in __DEV__ */
export function createNoOpAnalyticsService(): AnalyticsService {
  return {
    identify(userId: string) {
      if (__DEV__) console.log('[analytics:noop] identify', userId);
    },
    track<E extends AnalyticsEventName>(event: E, properties: AnalyticsEventMap[E]) {
      if (__DEV__) console.log('[analytics:noop] track', event, properties);
    },
    reset() {
      if (__DEV__) console.log('[analytics:noop] reset');
    },
    optIn() {},
    optOut() {},
    async flush() {},
  };
}
