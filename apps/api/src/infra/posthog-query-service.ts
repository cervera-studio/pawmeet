import { logger } from '@pawmeet/utils';

export interface DauMauMetrics {
  dauToday: number;
  mauCurrent: number;
  dauTimeSeries: Array<{ date: string; count: number }>;
}

/**
 * Queries PostHog for DAU/MAU metrics via the HogQL API.
 * Requires a personal API key with `query:read` scope.
 */
export class PostHogQueryService {
  constructor(
    private host: string,
    private personalApiKey: string,
    private projectId: string,
  ) {}

  async getDauMauMetrics(timeSeriesDays = 30): Promise<DauMauMetrics> {
    const [dauToday, mauCurrent, dauTimeSeries] = await Promise.all([
      this.queryScalar(
        `SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= today()`,
      ),
      this.queryScalar(
        `SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= now() - INTERVAL 30 DAY`,
      ),
      this.queryTimeSeries(timeSeriesDays),
    ]);

    return { dauToday, mauCurrent, dauTimeSeries };
  }

  private async queryScalar(hogql: string): Promise<number> {
    try {
      const res = await fetch(`${this.host}/api/projects/${this.projectId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.personalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
      });

      if (!res.ok) {
        logger.warn('PostHogQueryService', `Query failed: ${res.status}`);
        return 0;
      }

      const body = (await res.json()) as { results?: unknown[][] };
      return Number(body.results?.[0]?.[0] ?? 0);
    } catch (err) {
      logger.warn('PostHogQueryService', 'Query failed', err);
      return 0;
    }
  }

  private async queryTimeSeries(
    days: number,
  ): Promise<Array<{ date: string; count: number }>> {
    const hogql = `
      SELECT
        toDate(timestamp) AS day,
        count(DISTINCT person_id) AS dau
      FROM events
      WHERE timestamp >= now() - INTERVAL ${days} DAY
      GROUP BY day
      ORDER BY day
    `;

    try {
      const res = await fetch(`${this.host}/api/projects/${this.projectId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.personalApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: { kind: 'HogQLQuery', query: hogql } }),
      });

      if (!res.ok) {
        logger.warn('PostHogQueryService', `Time series query failed: ${res.status}`);
        return [];
      }

      const body = (await res.json()) as { results?: [string, number][] };
      return (body.results ?? []).map(([date, count]) => ({
        date: String(date),
        count: Number(count),
      }));
    } catch (err) {
      logger.warn('PostHogQueryService', 'Time series query failed', err);
      return [];
    }
  }
}
