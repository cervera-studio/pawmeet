export interface AnalyticsRepository {
  /** Anonymize all analytics events for a user (GDPR: SET userId = NULL) */
  anonymizeUserEvents(userId: string): Promise<void>;
}
