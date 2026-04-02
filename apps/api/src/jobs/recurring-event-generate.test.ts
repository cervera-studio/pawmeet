import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GroupEvent } from '@pawmeet/types';
import type {
  GroupEventRecurrenceRepository,
  GroupEventRepository,
} from '../ports/group-event-repository.js';

let capturedProcessor: () => Promise<void>;

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

vi.mock('./queues/index.js', () => ({
  getRedisConnection: vi.fn().mockReturnValue({}),
  QUEUE_NAMES: { RECURRING_EVENT: 'recurring-event' },
}));

vi.mock('@pawmeet/utils', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockRRuleBetween = vi.fn();

vi.mock('../lib/rrule.js', () => ({
  RRule: {
    fromString: () => ({ between: mockRRuleBetween }),
  },
}));

vi.mock('@pawmeet/config', () => ({
  GROUP_EVENT_OCCURRENCES_AHEAD: 4,
}));

vi.mock('@pawmeet/types', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@pawmeet/types')>();
  return {
    ...actual,
    GROUP_EVENT_STATUS: { COMPLETED: 'completed' },
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

const now = new Date('2026-04-02T10:00:00.000Z');

function buildTemplate(overrides: Partial<GroupEvent> = {}): GroupEvent {
  return {
    id: 'template-1',
    createdBy: 'user-1',
    title: 'Weekly Walk',
    description: null,
    scheduledAt: new Date('2026-04-01T09:00:00.000Z'),
    durationMin: 60,
    location: 'Parco Sempione',
    latitude: 45.47,
    longitude: 9.18,
    maxParticipants: 10,
    visibility: 'public',
    status: 'scheduled',
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=TU',
    recurrenceEnd: null,
    parentEventId: null,
    category: 'walk',
    requiresApproval: false,
    coverImageUrl: null,
    organizationId: null,
    isOfficial: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } satisfies GroupEvent;
}

type Deps = Pick<GroupEventRepository, 'create' | 'updateStatus'> & GroupEventRecurrenceRepository;

function buildGroupEventRepo(overrides: Partial<Deps> = {}): Deps {
  return {
    create: vi.fn().mockResolvedValue({}),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findTemplates: vi.fn().mockResolvedValue([]),
    findOccurrences: vi.fn().mockResolvedValue([]),
    countActiveTemplates: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('createRecurringEventWorker', () => {
  let repo: ReturnType<typeof buildGroupEventRepo>;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    repo = buildGroupEventRepo();

    const { createRecurringEventWorker } = await import('./recurring-event-generate.js');
    createRecurringEventWorker({ groupEventRepo: repo });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates occurrences for a template with no future occurrences', async () => {
    const template = buildTemplate();
    (repo.findTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([template]);
    (repo.findOccurrences as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    mockRRuleBetween.mockReturnValue([
      new Date('2026-04-08T00:00:00.000Z'),
      new Date('2026-04-15T00:00:00.000Z'),
      new Date('2026-04-22T00:00:00.000Z'),
      new Date('2026-04-29T00:00:00.000Z'),
    ]);

    await capturedProcessor();

    expect(repo.create).toHaveBeenCalledTimes(4);
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Weekly Walk',
        parentEventId: 'template-1',
        createdBy: 'user-1',
      }),
    );
  });

  it('skips templates that already have enough future occurrences', async () => {
    const template = buildTemplate();
    (repo.findTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([template]);
    const futureOccurrences = Array.from({ length: 4 }, (_, i) => ({
      ...template,
      id: `occ-${i}`,
      scheduledAt: new Date(now.getTime() + (i + 1) * 7 * 24 * 60 * 60 * 1000),
    }));
    (repo.findOccurrences as ReturnType<typeof vi.fn>).mockResolvedValue(futureOccurrences);

    await capturedProcessor();

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('completes template when recurrenceEnd has passed', async () => {
    const template = buildTemplate({
      recurrenceEnd: new Date('2026-03-31T00:00:00.000Z'),
    });
    (repo.findTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([template]);

    await capturedProcessor();

    expect(repo.updateStatus).toHaveBeenCalledWith('template-1', 'completed');
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('skips templates without a recurrence rule', async () => {
    const template = buildTemplate({ recurrenceRule: null });
    (repo.findTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([template]);

    await capturedProcessor();

    expect(repo.create).not.toHaveBeenCalled();
  });

  it('handles RRule parse errors without crashing', async () => {
    const template = buildTemplate();
    (repo.findTemplates as ReturnType<typeof vi.fn>).mockResolvedValue([template]);
    (repo.findOccurrences as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    mockRRuleBetween.mockImplementation(() => {
      throw new Error('Invalid RRULE');
    });

    await expect(capturedProcessor()).resolves.toBeUndefined();
  });

  it('does nothing when there are no templates', async () => {
    await capturedProcessor();

    expect(repo.create).not.toHaveBeenCalled();
    expect(repo.updateStatus).not.toHaveBeenCalled();
  });
});
