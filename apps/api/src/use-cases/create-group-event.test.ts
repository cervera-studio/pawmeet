import { GROUP_EVENT_VISIBILITY, isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogRepo, buildGroupEventRepo } from '../test-utils/builders.js';
import { createCreateGroupEvent } from './create-group-event.js';

const futureDate = new Date('2027-06-15T10:00:00Z');

const validInput = {
  title: 'Passeggiata al parco',
  scheduledAt: futureDate,
  durationMin: 60,
  location: 'Parco Sempione',
  latitude: 45.4729,
  longitude: 9.1797,
  maxParticipants: 10,
  visibility: GROUP_EVENT_VISIBILITY.PUBLIC,
  dogId: 'dog-1',
};

describe('createGroupEvent', () => {
  it('creates an event and adds the creator as organizer', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', validInput);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.id).toBe('event-1');
    expect(groupEventRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Passeggiata al parco', createdBy: 'user-1' }),
    );
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ isOrganizer: true, status: 'accepted' }),
    );
  });

  it('fails when scheduledAt is in the past', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', {
      ...validInput,
      scheduledAt: new Date('2020-01-01'),
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_INVALID_DATE');
  });

  it('fails when maxParticipants is less than 2', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', { ...validInput, maxParticipants: 1 });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_MIN_PARTICIPANTS');
  });

  it('fails when dog does not belong to user', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo({ findByIdAndOwner: vi.fn().mockResolvedValue(null) });
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', validInput);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_NOT_FOUND');
  });
});
