import type { ActivitySummary, Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { ActivityRepository } from '../ports/activity-repository.js';

type Deps = {
  activityRepo: ActivityRepository;
};

/** Get the Monday of the week containing the given date */
function getWeekStart(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDay();
  // Sunday = 0, Monday = 1, etc. Shift so Monday = 0
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

/** Get the first day of the month containing the given date */
function getMonthStart(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}

export function createGetActivityStats({ activityRepo }: Deps) {
  return async (
    userId: string,
    input: { period: 'week' | 'month'; date?: string },
  ): Promise<Result<{ summary: ActivitySummary }>> => {
    const refDate = input.date ?? new Date().toISOString().slice(0, 10);

    let summary: ActivitySummary;

    if (input.period === 'week') {
      const weekStart = getWeekStart(refDate);
      summary = await activityRepo.getWeeklySummary(userId, weekStart);
    } else {
      const monthStart = getMonthStart(refDate);
      summary = await activityRepo.getMonthlySummary(userId, monthStart);
    }

    return succeed({ summary });
  };
}
