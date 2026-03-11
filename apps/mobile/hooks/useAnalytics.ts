import { container } from 'tsyringe';
import { ANALYTICS_SERVICE } from '@/repositories/tokens';

const analyticsService = container.resolve(ANALYTICS_SERVICE);

/** Resolved AnalyticsService singleton — use in hooks and view-models. */
export function useAnalyticsService() {
  return analyticsService;
}
