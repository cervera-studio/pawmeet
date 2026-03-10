import type { DogProfile, GroupEvent, GroupEventParticipant } from '@dogwalk/types';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { DogRepository } from '../ports/dog-repository.js';
import type { GroupEventRepository } from '../ports/group-event-repository.js';
import type { NotificationService } from '../ports/notification-service.js';
import { createJoinGroupEvent } from './join-group-event.js';

function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-2',
    ownerId: 'user-2',
    name: 'Luna',
    birthDate: new Date('2023-01-01'),
    breed: 'Beagle',
    breedSecondary: null,
    size: 'media',
    weightKg: 12,
    gender: 'femmina',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'socievole',
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

function buildParticipant(overrides: Partial<GroupEventParticipant> = {}): GroupEventParticipant {
  return {
    id: 'p-1',
    eventId: 'event-1',
    userId: 'user-2',
    dogId: 'dog-2',
    status: 'accepted',
    isOrganizer: false,
    joinedAt: new Date(),
    ...overrides,
  };
}

function buildGroupEventRepo(overrides: Partial<GroupEventRepository> = {}): GroupEventRepository {
  return {
    create: vi.fn(),
    findById: vi.fn().mockResolvedValue(buildGroupEvent()),
    findByIdWithParticipants: vi.fn(),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    addParticipant: vi.fn().mockResolvedValue(buildParticipant()),
    findParticipant: vi.fn().mockResolvedValue(null),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn().mockResolvedValue(3),
    promoteFromWaitlist: vi.fn(),
    findScheduledPastStart: vi.fn(),
    findInProgressPastEnd: vi.fn(),
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

function buildNotificationService(): NotificationService {
  return { send: vi.fn().mockResolvedValue(undefined) };
}

describe('joinGroupEvent', () => {
  it('joins an event with accepted status when capacity available', async () => {
    const groupEventRepo = buildGroupEventRepo({ countParticipants: vi.fn().mockResolvedValue(3) });
    const dogRepo = buildDogRepo();
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.status).toBe('accepted');
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('joins with waitlisted status when event is full', async () => {
    const groupEventRepo = buildGroupEventRepo({
      countParticipants: vi.fn().mockResolvedValue(10),
      addParticipant: vi.fn().mockResolvedValue(buildParticipant({ status: 'waitlisted' })),
    });
    const dogRepo = buildDogRepo();
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'waitlisted' }),
    );
  });

  it('fails when event does not exist', async () => {
    const groupEventRepo = buildGroupEventRepo({ findById: vi.fn().mockResolvedValue(null) });
    const dogRepo = buildDogRepo();
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('fails when already joined', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findParticipant: vi.fn().mockResolvedValue(buildParticipant()),
    });
    const dogRepo = buildDogRepo();
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_JOINED');
  });

  it('fails when event is cancelled', async () => {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(buildGroupEvent({ status: 'cancelled' })),
    });
    const dogRepo = buildDogRepo();
    const notificationService = buildNotificationService();
    const joinEvent = createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_JOINABLE');
  });
});
