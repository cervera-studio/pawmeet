import { createHash } from 'node:crypto';

import { CONSENT_TYPE } from '@pawmeet/db';
import { logger } from '@pawmeet/utils';

import { redis } from '../lib/redis.js';
import type { ExperimentService } from '../ports/experiment-service.js';
import type { ConsentRepository } from './drizzle-consent-repository.js';

interface ExperimentConfig {
  splitPercent: number;
  status: 'running' | 'paused' | 'completed';
  startedAt: string;
}

type Variant = 'control' | 'treatment';

function assignVariant(userId: string, experimentName: string, splitPercent: number): Variant {
  const hash = createHash('sha256').update(`${experimentName}:${userId}`).digest();
  const bucket = hash.readUInt16BE(0) % 100;
  return bucket < splitPercent ? 'treatment' : 'control';
}

export class RedisExperimentService implements ExperimentService {
  private consentRepo: ConsentRepository;

  constructor(consentRepo: ConsentRepository) {
    this.consentRepo = consentRepo;
  }

  async initialize(): Promise<void> {
    logger.info('RedisExperimentService', 'Initialized (shared Redis connection)');
  }

  async shutdown(): Promise<void> {
    // No-op — Redis connection is shared
  }

  private async hasAbTestingConsent(userId: string): Promise<boolean> {
    const consents = await this.consentRepo.findByUser(userId);
    const abConsent = consents.find((c) => c.consentType === CONSENT_TYPE.AbTesting);
    return abConsent?.granted === true;
  }

  private async isKilled(experimentName: string): Promise<boolean> {
    const kill = await redis.get(`experiment:${experimentName}:kill`);
    return kill === '1';
  }

  private async getConfig(experimentName: string): Promise<ExperimentConfig | null> {
    const config = await redis.get<ExperimentConfig>(`experiment:${experimentName}`);
    return config ?? null;
  }

  private async getOrAssignVariant(
    userId: string,
    experimentName: string,
    splitPercent: number,
  ): Promise<Variant> {
    const key = `experiment:${experimentName}:user:${userId}`;
    const existing = await redis.get<Variant>(key);
    if (existing) return existing;

    const variant = assignVariant(userId, experimentName, splitPercent);
    await redis.set(key, variant);
    return variant;
  }

  async checkGate(userId: string, gateName: string): Promise<boolean> {
    if (await this.isKilled(gateName)) return false;
    if (!(await this.hasAbTestingConsent(userId))) return false;

    const config = await this.getConfig(gateName);
    if (!config || config.status !== 'running') return false;

    const variant = await this.getOrAssignVariant(userId, gateName, config.splitPercent);
    return variant === 'treatment';
  }

  async getExperiment(
    userId: string,
    experimentName: string,
  ): Promise<{ value: boolean; groupName: string | null }> {
    if (await this.isKilled(experimentName)) {
      return { value: false, groupName: null };
    }
    if (!(await this.hasAbTestingConsent(userId))) {
      return { value: false, groupName: null };
    }

    const config = await this.getConfig(experimentName);
    if (!config || config.status !== 'running') {
      return { value: false, groupName: null };
    }

    const variant = await this.getOrAssignVariant(userId, experimentName, config.splitPercent);
    return { value: variant === 'treatment', groupName: variant };
  }

  async getConfigValue<T>(
    userId: string,
    configName: string,
    paramName: string,
    fallback: T,
  ): Promise<T> {
    if (!(await this.hasAbTestingConsent(userId))) return fallback;

    const value = await redis.get<T>(`experiment:${configName}:config:${paramName}`);
    return value ?? fallback;
  }

  async logEvent(
    _userId: string,
    _eventName: string,
    _value?: string | number,
    _metadata?: Record<string, string>,
  ): Promise<void> {
    // No-op — events go through PostHog/Neon pipeline
  }
}
