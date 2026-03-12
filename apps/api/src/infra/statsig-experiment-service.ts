import { createHmac } from 'node:crypto';
import { logger } from '@pawmeet/utils';
import { Statsig, StatsigUser } from '@statsig/statsig-node-core';
import type { ExperimentService } from '../ports/experiment-service.js';

/** One-way hash of userId to prevent sending raw UUIDs to third-party services */
function pseudonymizeUserId(userId: string): string {
  const salt = process.env.ANALYTICS_HASH_SALT ?? 'pawmeet-default-salt';
  return createHmac('sha256', salt).update(userId).digest('hex').slice(0, 32);
}

export class StatsigExperimentService implements ExperimentService {
  private client: Statsig;

  constructor(serverSecretKey: string) {
    this.client = new Statsig(serverSecretKey);
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
    logger.info('StatsigExperimentService', 'Statsig initialized');
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }

  private buildUser(userId: string): StatsigUser {
    return new StatsigUser({ userID: pseudonymizeUserId(userId) });
  }

  checkGate(userId: string, gateName: string): boolean {
    const user = this.buildUser(userId);
    return this.client.checkGate(user, gateName);
  }

  getExperiment(
    userId: string,
    experimentName: string,
  ): { value: boolean; groupName: string | null } {
    const user = this.buildUser(userId);
    const experiment = this.client.getExperiment(user, experimentName);
    return {
      value: experiment.get('enabled', false),
      groupName: experiment.getGroupName() ?? null,
    };
  }

  getConfigValue<T>(userId: string, configName: string, paramName: string, fallback: T): T {
    const user = this.buildUser(userId);
    const experiment = this.client.getExperiment(user, configName);
    return experiment.get(paramName, fallback);
  }

  logEvent(
    userId: string,
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string>,
  ): void {
    const user = this.buildUser(userId);
    this.client.logEvent(user, eventName, value, metadata);
  }
}
