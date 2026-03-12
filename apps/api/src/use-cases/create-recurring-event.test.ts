import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildGroupEvent,
  buildGroupEventRepo,
} from '../test-utils/builders.js';
import { createCreateRecurringEvent } from './create-recurring-event.js';

describe('createRecurringEvent', () => {
  const baseInput = {
    title: 'Passeggiata settimanale',
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 60,
    location: 'Parco Sempione',
    latitude: 45.4729,
    longitude: 9.1797,
    maxParticipants: 10,
    visibility: 'public' as const,
    dogId: 'dog-1',
    recurrenceRule: 'FREQ=WEEKLY;BYDAY=SA',
  };

  function setup(overrides: { activeTemplates?: number } = {}) {
    let callCount = 0;
    const groupEventRepo = buildGroupEventRepo({
      countActiveTemplates: vi.fn().mockResolvedValue(overrides.activeTemplates ?? 0),
      create: vi.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(
          buildGroupEvent({
            id: `event-${callCount}`,
            status: callCount === 1 ? 'template' : 'scheduled',
          }),
        );
      }),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });

    const createRecurring = createCreateRecurringEvent({ groupEventRepo, dogRepo });
    return { createRecurring, groupEventRepo };
  }

  it('creates template + occurrences', async () => {
    const { createRecurring, groupEventRepo } = setup();

    const result = await createRecurring('user-1', baseInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.template).toBeDefined();
    expect(result.data.occurrences.length).toBeGreaterThan(0);
    expect(result.data.occurrences.length).toBeLessThanOrEqual(4);
    // Template + occurrences
    expect(groupEventRepo.create).toHaveBeenCalled();
  });

  it('fails when max templates reached', async () => {
    const { createRecurring } = setup({ activeTemplates: 3 });

    const result = await createRecurring('user-1', baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('MAX_TEMPLATES_REACHED');
  });

  it('fails when dog not found', async () => {
    const groupEventRepo = buildGroupEventRepo({
      countActiveTemplates: vi.fn().mockResolvedValue(0),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(null),
    });
    const createRecurring = createCreateRecurringEvent({ groupEventRepo, dogRepo });

    const result = await createRecurring('user-1', baseInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
