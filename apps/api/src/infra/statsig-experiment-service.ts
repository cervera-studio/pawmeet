import { CONSENT_TYPE } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';
import { Statsig, StatsigUser } from '@statsig/statsig-node-core';
import { pseudonymizeUserId } from '../lib/pseudonymize.js';
import type { ExperimentService } from '../ports/experiment-service.js';
import type { ConsentRepository } from './drizzle-consent-repository.js';

export class StatsigExperimentService implements ExperimentService {
  private client: Statsig;
  private consentRepo: ConsentRepository;

  constructor(serverSecretKey: string, consentRepo: ConsentRepository) {
    this.client = new Statsig(serverSecretKey);
    this.consentRepo = consentRepo;
  }

  async initialize(): Promise<void> {
    await this.client.initialize();
    logger.info('StatsigExperimentService', 'Statsig initialized');
  }

  async shutdown(): Promise<void> {
    await this.client.shutdown();
  }

  /** Check if user has granted ab_testing consent. */
  private async hasAbTestingConsent(userId: string): Promise<boolean> {
    const consents = await this.consentRepo.findByUser(userId);
    const abConsent = consents.find((c) => c.consentType === CONSENT_TYPE.AbTesting);
    return abConsent?.granted === true;
  }

  private buildUser(userId: string): StatsigUser {
    return new StatsigUser({ userID: pseudonymizeUserId(userId) });
  }

  async checkGate(userId: string, gateName: string): Promise<boolean> {
    if (!(await this.hasAbTestingConsent(userId))) return false;
    const user = this.buildUser(userId);
    return this.client.checkGate(user, gateName);
  }

  async getExperiment(
    userId: string,
    experimentName: string,
  ): Promise<{ value: boolean; groupName: string | null }> {
    if (!(await this.hasAbTestingConsent(userId))) {
      return { value: false, groupName: null };
    }
    const user = this.buildUser(userId);
    const experiment = this.client.getExperiment(user, experimentName);
    return {
      value: experiment.get('enabled', false),
      groupName: experiment.getGroupName() ?? null,
    };
  }

  async getConfigValue<T>(
    userId: string,
    configName: string,
    paramName: string,
    fallback: T,
  ): Promise<T> {
    if (!(await this.hasAbTestingConsent(userId))) return fallback;
    const user = this.buildUser(userId);
    const experiment = this.client.getExperiment(user, configName);
    return experiment.get(paramName, fallback);
  }

  async logEvent(
    userId: string,
    eventName: string,
    value?: string | number,
    metadata?: Record<string, string>,
  ): Promise<void> {
    if (!(await this.hasAbTestingConsent(userId))) return;
    const user = this.buildUser(userId);
    this.client.logEvent(user, eventName, value, metadata);
  }
}
