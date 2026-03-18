/** Abstraction over external analytics providers (PostHog, OpenPanel, etc.). */
export interface AnalyticsProvider {
  readonly name: string;

  /** Forward a batch of events to the external provider. */
  capture(events: readonly AnalyticsProviderEvent[]): Promise<void>;

  /** GDPR: delete person record by raw userId. Implementation handles pseudonymization. */
  deletePerson(userId: string): Promise<void>;

  /** Graceful shutdown — flush pending events before process exit. */
  shutdown(): Promise<void>;
}

export interface AnalyticsProviderEvent {
  /** Pseudonymized userId (HMAC-SHA256). Never a raw UUID. */
  distinctId: string;
  event: string;
  properties: Record<string, unknown>;
  timestamp: string;
  /** Client-generated event ID for deduplication. */
  uuid: string;
}
