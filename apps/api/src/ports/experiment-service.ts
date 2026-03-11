/** Abstraction over feature flagging and experimentation (Statsig). */
export interface ExperimentService {
  /** Initialize the service. Must be called once at startup. */
  initialize(): Promise<void>;

  /** Shut down the service. Call on app shutdown. */
  shutdown(): Promise<void>;

  /** Check a feature gate for a user. */
  checkGate(userId: string, gateName: string): boolean;

  /** Get experiment variant value for a user. */
  getExperiment(
    userId: string,
    experimentName: string,
  ): { value: boolean; groupName: string | null };

  /** Get a dynamic config parameter for a user. */
  getConfigValue<T>(userId: string, configName: string, paramName: string, fallback: T): T;

  /** Log a custom event for metrics/analytics. */
  logEvent(
    userId: string,
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string>,
  ): void;
}
