/** Abstraction over feature flagging and experimentation (Statsig). */
export interface ExperimentService {
  /** Initialize the service. Must be called once at startup. */
  initialize(): Promise<void>;

  /** Shut down the service. Call on app shutdown. */
  shutdown(): Promise<void>;

  /** Check a feature gate for a user. Returns false if user has not consented. */
  checkGate(userId: string, gateName: string): boolean | Promise<boolean>;

  /** Get experiment variant value for a user. Returns defaults if user has not consented. */
  getExperiment(
    userId: string,
    experimentName: string,
  ):
    | { value: boolean; groupName: string | null }
    | Promise<{ value: boolean; groupName: string | null }>;

  /** Get a dynamic config parameter for a user. Returns fallback if user has not consented. */
  getConfigValue<T>(
    userId: string,
    configName: string,
    paramName: string,
    fallback: T,
  ): T | Promise<T>;

  /** Log a custom event for metrics/analytics. No-op if user has not consented. */
  logEvent(
    userId: string,
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string>,
  ): void | Promise<void>;
}
