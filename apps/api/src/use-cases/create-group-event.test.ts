import type { DogProfile, GroupEvent } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository } from '../ports/dog-repository.js';
import type { GroupEventRepository } from '../ports/group-event-repository.js';
import { createCreateGroupEvent } from './create-group-event.js';

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

function buildGroupEvent(overrides: Partial<GroupEvent> = {}): GroupEvent {
  return {
    id: 'event-1',
    createdBy: 'user-1',
    title: 'Passeggiata al parco',
    description: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 60,
    location: 'Parco Sempione',
    latitude: 45.4729,
    longitude: 9.1797,
    maxParticipants: 10,
    visibility: 'public',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildGroupEventRepo(
  overrides: Partial<GroupEventRepository> = {},
): GroupEventRepository {
  return {
    create: vi.fn().mockResolvedValue(buildGroupEvent()),
    findById: vi.fn(),
    findByIdWithParticipants: vi.fn(),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    addParticipant: vi.fn().mockResolvedValue({
      id: 'p-1',
      eventId: 'event-1',
      userId: 'user-1',
      dogId: 'dog-1',
      status: 'accepted',
      isOrganizer: true,
      joinedAt: new Date(),
    }),
    findParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn(),
    promoteFromWaitlist: vi.fn(),
    ...overrides,
  };
}

function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByOwner: vi.fn(),
    findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    countByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findPhotos: vi.fn(),
    countPhotos: vi.fn(),
    addPhoto: vi.fn(),
    findPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoPositions: vi.fn(),
    findPhotoById: vi.fn(),
    updatePhotoModerationStatus: vi.fn(),
    ...overrides,
  };
}

const futureDate = new Date('2027-06-15T10:00:00Z');

const validInput = {
  title: 'Passeggiata al parco',
  scheduledAt: futureDate,
  durationMin: 60,
  location: 'Parco Sempione',
  latitude: 45.4729,
  longitude: 9.1797,
  maxParticipants: 10,
  visibility: 'public' as const,
  dogId: 'dog-1',
};

describe('createGroupEvent', () => {
  it('creates an event and adds the creator as organizer', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo();
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
    const dogRepo = buildDogRepo();
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', {
      ...validInput,
      scheduledAt: new Date('2020-01-01'),
    });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_INVALID_DATE');
  });

  it('fails when maxParticipants is less than 3', async () => {
    const groupEventRepo = buildGroupEventRepo();
    const dogRepo = buildDogRepo();
    const createEvent = createCreateGroupEvent({ groupEventRepo, dogRepo });

    const result = await createEvent('user-1', { ...validInput, maxParticipants: 2 });

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
