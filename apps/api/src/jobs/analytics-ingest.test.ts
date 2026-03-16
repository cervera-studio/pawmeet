import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AnalyticsJobRepository } from '../ports/analytics-job-repository.js';
import type { AnalyticsProvider, AnalyticsProviderEvent } from '../ports/analytics-provider.js';
import type { AnalyticsJobData } from './queue.js';

// Capture the processor function passed to the BullMQ Worker constructor
let capturedProcessor: (job: { data: AnalyticsJobData }) => Promise<void>;

vi.mock('bullmq', () => {
  const WorkerMock = function (
    this: { on: ReturnType<typeof vi.fn> },
    _name: string,
    processor: typeof capturedProcessor,
  ) {
    capturedProcessor = processor;
    this.on = vi.fn();
  };
  return { Worker: WorkerMock };
});

vi.mock('@pawmeet/db', () => ({
  CONSENT_TYPE: {
    Analytics: 'analytics',
    AbTesting: 'ab_testing',
    ErrorTracking: 'error_tracking',
    Marketing: 'marketing',
    AiTraining: 'ai_training',
  },
}));

vi.mock('./queue.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  moveToAnalyticsDlq: vi.fn().mockResolvedValue(undefined),
  QUEUE_NAMES: { ANALYTICS: 'analytics' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('@pawmeet/config', () => ({
  ANALYTICS_MAX_EVENT_AGE_DAYS: 30,
  ANALYTICS_WORKER_CONCURRENCY: 5,
}));

vi.mock('../lib/pseudonymize.js', () => ({
  pseudonymizeUserId: vi.fn((id: string) => `hashed_${id}`),
}));

// ── Builders ────────────────────────────────────────────────────────────────

function buildEvent(
  overrides: Partial<AnalyticsJobData['events'][0]> = {},
): AnalyticsJobData['events'][0] {
  return {
    clientEventId: `evt_${crypto.randomUUID()}`,
    userId: 'user-123',
    eventName: 'match_created',
    properties: { compatibilityScore: 85 },
    clientTimestamp: new Date().toISOString(),
    platform: 'server',
    ...overrides,
  };
}

function buildProvider(overrides: Partial<AnalyticsProvider> = {}): AnalyticsProvider {
  return {
    name: 'test-provider',
    capture: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function buildAnalyticsJobRepo(
  overrides: Partial<AnalyticsJobRepository> = {},
): AnalyticsJobRepository {
  return {
    insertEvents: vi.fn().mockResolvedValue(undefined),
    getEventCountForDay: vi.fn().mockResolvedValue(0),
    getUniqueUsersForDay: vi.fn().mockResolvedValue(0),
    getEventCountsByName: vi.fn().mockResolvedValue([]),
    upsertDailyMetrics: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('createAnalyticsWorker', () => {
  let provider: AnalyticsProvider;
  let analyticsJobRepo: AnalyticsJobRepository;

  beforeEach(async () => {
    vi.clearAllMocks();
    provider = buildProvider();
    analyticsJobRepo = buildAnalyticsJobRepo();

    const { createAnalyticsWorker } = await import('./analytics-ingest.js');
    createAnalyticsWorker({
      providers: [provider],
      consentRepo: null as never,
      analyticsJobRepo,
    });
  });

  it('inserts valid events via analyticsJobRepo', async () => {
    const event = buildEvent();
    await capturedProcessor({ data: { events: [event] } });

    expect(analyticsJobRepo.insertEvents).toHaveBeenCalledTimes(1);
  });

  it('forwards events to provider after insert', async () => {
    const event = buildEvent();
    await capturedProcessor({ data: { events: [event] } });

    expect(provider.capture).toHaveBeenCalledTimes(1);
    const captured = (provider.capture as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as AnalyticsProviderEvent[];
    expect(captured).toHaveLength(1);
    expect(captured[0].event).toBe('match_created');
  });

  it('uses pseudonymized distinctId, never raw UUID', async () => {
    const event = buildEvent({ userId: 'raw-uuid-123' });
    await capturedProcessor({ data: { events: [event] } });

    const captured = (provider.capture as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as AnalyticsProviderEvent[];
    expect(captured[0].distinctId).toBe('hashed_raw-uuid-123');
    expect(captured[0].distinctId).not.toBe('raw-uuid-123');
  });

  it('passes clientEventId as uuid for deduplication', async () => {
    const event = buildEvent({ clientEventId: 'srv_dedup-123' });
    await capturedProcessor({ data: { events: [event] } });

    const captured = (provider.capture as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as AnalyticsProviderEvent[];
    expect(captured[0].uuid).toBe('srv_dedup-123');
  });

  it('does not forward events with null userId to provider', async () => {
    const event = buildEvent({ userId: null });
    await capturedProcessor({ data: { events: [event] } });

    // Repository still gets the insert
    expect(analyticsJobRepo.insertEvents).toHaveBeenCalledTimes(1);
    // But provider gets nothing (can't pseudonymize null)
    expect(provider.capture).not.toHaveBeenCalled();
  });

  it('provider failure does not fail the BullMQ job', async () => {
    const failingProvider = buildProvider({
      capture: vi.fn().mockRejectedValue(new Error('PostHog down')),
    });

    vi.clearAllMocks();
    analyticsJobRepo = buildAnalyticsJobRepo();
    const { createAnalyticsWorker } = await import('./analytics-ingest.js');
    createAnalyticsWorker({
      providers: [failingProvider],
      consentRepo: null as never,
      analyticsJobRepo,
    });

    const event = buildEvent();
    // Should not throw
    await expect(capturedProcessor({ data: { events: [event] } })).resolves.toBeUndefined();

    // Insert still happened
    expect(analyticsJobRepo.insertEvents).toHaveBeenCalledTimes(1);
  });

  it('filters out events older than max age', async () => {
    const staleEvent = buildEvent({
      clientTimestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await capturedProcessor({ data: { events: [staleEvent] } });

    // No insert because all events were filtered
    expect(analyticsJobRepo.insertEvents).not.toHaveBeenCalled();
    expect(provider.capture).not.toHaveBeenCalled();
  });

  it('works with no providers configured', async () => {
    vi.clearAllMocks();
    analyticsJobRepo = buildAnalyticsJobRepo();
    const { createAnalyticsWorker } = await import('./analytics-ingest.js');
    createAnalyticsWorker({
      providers: [],
      consentRepo: null as never,
      analyticsJobRepo,
    });

    const event = buildEvent();
    await capturedProcessor({ data: { events: [event] } });

    // Insert still works
    expect(analyticsJobRepo.insertEvents).toHaveBeenCalledTimes(1);
  });

  it('handles mixed valid and stale events', async () => {
    const valid = buildEvent();
    const stale = buildEvent({
      clientTimestamp: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString(),
    });

    await capturedProcessor({ data: { events: [valid, stale] } });

    // Only 1 event inserted (the valid one)
    expect(analyticsJobRepo.insertEvents).toHaveBeenCalledTimes(1);
    const insertedValues = (analyticsJobRepo.insertEvents as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    expect(insertedValues).toHaveLength(1);
  });
});
