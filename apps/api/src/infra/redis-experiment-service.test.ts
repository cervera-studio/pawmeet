import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock('../lib/redis.js', () => ({
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
  },
}));

vi.mock('@pawmeet/db', () => ({
  CONSENT_TYPE: {
    Analytics: 'analytics',
    AbTesting: 'ab_testing',
    ErrorTracking: 'error_tracking',
    Marketing: 'marketing',
    AiTraining: 'ai_training',
  },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import type { ConsentRecord, ConsentRepository } from './drizzle-consent-repository.js';
import { RedisExperimentService } from './redis-experiment-service.js';

// --- helpers ---

function buildConsentRepo(overrides: Partial<ConsentRepository> = {}): ConsentRepository {
  return {
    upsert: vi.fn(),
    findByUser: vi.fn<ConsentRepository['findByUser']>().mockResolvedValue([]),
    ...overrides,
  };
}

function abTestingConsent(granted: boolean): ConsentRecord {
  return { consentType: 'ab_testing', granted, grantedAt: new Date(), source: 'test' };
}

function runningConfig(splitPercent = 50) {
  return { splitPercent, status: 'running' as const, startedAt: '2026-01-01T00:00:00Z' };
}

// --- tests ---

describe('RedisExperimentService', () => {
  let consentRepo: ConsentRepository;
  let service: RedisExperimentService;

  beforeEach(() => {
    vi.clearAllMocks();
    consentRepo = buildConsentRepo({
      findByUser: vi
        .fn<ConsentRepository['findByUser']>()
        .mockResolvedValue([abTestingConsent(true)]),
    });
    service = new RedisExperimentService(consentRepo);
  });

  describe('deterministic assignment', () => {
    // SHA-256 of "test-exp:user-1" → bucket 4 → treatment when splitPercent > 4
    // SHA-256 of "test-exp:user-2" → bucket 67 → control when splitPercent = 30

    it('assigns treatment when bucket < splitPercent', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(50);
        if (key === 'experiment:test-exp:user:user-1') return null;
        return null;
      });
      mockRedisSet.mockResolvedValue('OK');

      const result = await service.checkGate('user-1', 'test-exp');
      // bucket 4 < 50 → treatment → true
      expect(result).toBe(true);
    });

    it('assigns control when bucket >= splitPercent', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(30);
        if (key === 'experiment:test-exp:user:user-2') return null;
        return null;
      });
      mockRedisSet.mockResolvedValue('OK');

      const result = await service.checkGate('user-2', 'test-exp');
      // bucket 67 >= 30 → control → false
      expect(result).toBe(false);
    });

    it('same userId + experimentName always returns same variant', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(50);
        if (key.startsWith('experiment:test-exp:user:')) return null;
        return null;
      });
      mockRedisSet.mockResolvedValue('OK');

      const r1 = await service.checkGate('user-1', 'test-exp');
      const r2 = await service.checkGate('user-1', 'test-exp');
      expect(r1).toBe(r2);
    });
  });

  describe('sticky assignment', () => {
    it('returns cached variant without recomputing', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(50);
        if (key === 'experiment:test-exp:user:user-1') return 'treatment';
        return null;
      });

      await service.checkGate('user-1', 'test-exp');

      // redis.set should NOT be called because variant was already stored
      expect(mockRedisSet).not.toHaveBeenCalled();
    });
  });

  describe('consent check', () => {
    it('returns false when user has no ab_testing consent', async () => {
      consentRepo = buildConsentRepo({
        findByUser: vi.fn<ConsentRepository['findByUser']>().mockResolvedValue([]),
      });
      service = new RedisExperimentService(consentRepo);

      mockRedisGet.mockImplementation((key: string) => {
        if (key.endsWith(':kill')) return null;
        return null;
      });

      const result = await service.checkGate('user-1', 'test-exp');
      expect(result).toBe(false);
    });

    it('returns false when ab_testing consent is not granted', async () => {
      consentRepo = buildConsentRepo({
        findByUser: vi
          .fn<ConsentRepository['findByUser']>()
          .mockResolvedValue([abTestingConsent(false)]),
      });
      service = new RedisExperimentService(consentRepo);

      mockRedisGet.mockImplementation((key: string) => {
        if (key.endsWith(':kill')) return null;
        return null;
      });

      const result = await service.checkGate('user-1', 'test-exp');
      expect(result).toBe(false);
    });
  });

  describe('kill switch', () => {
    it('returns false when kill switch is set', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return '1';
        return null;
      });

      const result = await service.checkGate('user-1', 'test-exp');
      expect(result).toBe(false);
    });
  });

  describe('experiment not running', () => {
    it('returns false when experiment status is paused', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp')
          return { splitPercent: 50, status: 'paused', startedAt: '2026-01-01T00:00:00Z' };
        return null;
      });

      const result = await service.checkGate('user-1', 'test-exp');
      expect(result).toBe(false);
    });
  });

  describe('experiment not found', () => {
    it('returns false when experiment config does not exist', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return null;
        return null;
      });

      const result = await service.checkGate('user-1', 'test-exp');
      expect(result).toBe(false);
    });
  });

  describe('getExperiment', () => {
    it('returns { value: true, groupName: "treatment" } for treatment variant', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(50);
        if (key === 'experiment:test-exp:user:user-1') return null;
        return null;
      });
      mockRedisSet.mockResolvedValue('OK');

      // user-1 bucket=4 < 50 → treatment
      const result = await service.getExperiment('user-1', 'test-exp');
      expect(result).toEqual({ value: true, groupName: 'treatment' });
    });

    it('returns { value: false, groupName: "control" } for control variant', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return runningConfig(30);
        if (key === 'experiment:test-exp:user:user-2') return null;
        return null;
      });
      mockRedisSet.mockResolvedValue('OK');

      // user-2 bucket=67 >= 30 → control
      const result = await service.getExperiment('user-2', 'test-exp');
      expect(result).toEqual({ value: false, groupName: 'control' });
    });

    it('returns { value: false, groupName: null } when killed', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return '1';
        return null;
      });

      const result = await service.getExperiment('user-1', 'test-exp');
      expect(result).toEqual({ value: false, groupName: null });
    });

    it('returns { value: false, groupName: null } without consent', async () => {
      consentRepo = buildConsentRepo();
      service = new RedisExperimentService(consentRepo);

      mockRedisGet.mockImplementation((key: string) => {
        if (key.endsWith(':kill')) return null;
        return null;
      });

      const result = await service.getExperiment('user-1', 'test-exp');
      expect(result).toEqual({ value: false, groupName: null });
    });

    it('returns { value: false, groupName: null } when not running', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:test-exp:kill') return null;
        if (key === 'experiment:test-exp') return null;
        return null;
      });

      const result = await service.getExperiment('user-1', 'test-exp');
      expect(result).toEqual({ value: false, groupName: null });
    });
  });

  describe('getConfigValue', () => {
    it('returns value from Redis when available', async () => {
      mockRedisGet.mockImplementation((key: string) => {
        if (key === 'experiment:my-config:config:threshold') return 42;
        return null;
      });

      const result = await service.getConfigValue('user-1', 'my-config', 'threshold', 10);
      expect(result).toBe(42);
    });

    it('returns fallback when Redis value is null', async () => {
      mockRedisGet.mockResolvedValue(null);

      const result = await service.getConfigValue('user-1', 'my-config', 'threshold', 10);
      expect(result).toBe(10);
    });

    it('returns fallback when user has no consent', async () => {
      consentRepo = buildConsentRepo();
      service = new RedisExperimentService(consentRepo);

      const result = await service.getConfigValue('user-1', 'my-config', 'threshold', 10);
      expect(result).toBe(10);
      // Should not even call redis.get for the config value
      expect(mockRedisGet).not.toHaveBeenCalled();
    });
  });

  describe('logEvent', () => {
    it('does not throw', async () => {
      await expect(
        service.logEvent('user-1', 'some_event', 42, { key: 'value' }),
      ).resolves.toBeUndefined();
    });
  });
});
