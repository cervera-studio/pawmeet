import type { GroupEventParticipant } from '@pawmeet/types';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildFollowRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createJoinGroupEvent } from './join-group-event.js';

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

function setup(overrides: {
  event?: ReturnType<typeof buildGroupEvent> | null;
  count?: number;
  existingParticipant?: GroupEventParticipant | null;
  areFriends?: boolean;
} = {}) {
  const event =
    overrides.event !== undefined ? overrides.event : buildGroupEvent();

  const groupEventRepo = buildGroupEventRepo({
    findById: vi.fn().mockResolvedValue(event),
    countParticipants: vi.fn().mockResolvedValue(overrides.count ?? 3),
    addParticipant: vi.fn().mockResolvedValue(buildParticipant()),
    findParticipant: vi.fn().mockResolvedValue(overrides.existingParticipant ?? null),
  });
  const dogRepo = buildDogRepo({
    findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
  });
  const followRepo = buildFollowRepo({
    areFriends: vi.fn().mockResolvedValue(overrides.areFriends ?? true),
  });
  const notificationService = buildNotificationService();

  const joinEvent = createJoinGroupEvent({
    groupEventRepo,
    dogRepo,
    followRepo,
    notificationService,
  });

  return { joinEvent, groupEventRepo, notificationService };
}

describe('joinGroupEvent', () => {
  it('joins an event with accepted status when capacity available', async () => {
    const { joinEvent, groupEventRepo } = setup();

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.participant.status).toBe('accepted');
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('fails when event is full', async () => {
    const { joinEvent } = setup({ count: 10 });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_FULL');
  });

  it('creates pending request when requiresApproval is true', async () => {
    const { joinEvent, groupEventRepo } = setup({
      event: buildGroupEvent({ requiresApproval: true }),
    });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('blocks non-friends from friends_only events', async () => {
    const { joinEvent } = setup({
      event: buildGroupEvent({ visibility: 'friends_only', createdBy: 'host-1' }),
      areFriends: false,
    });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_FRIENDS_ONLY');
  });

  it('fails when event does not exist', async () => {
    const { joinEvent } = setup({ event: null });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });

  it('fails when already joined', async () => {
    const { joinEvent } = setup({
      existingParticipant: buildParticipant(),
    });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_JOINED');
  });

  it('fails when event is cancelled', async () => {
    const { joinEvent } = setup({
      event: buildGroupEvent({ status: 'cancelled' }),
    });

    const result = await joinEvent('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_JOINABLE');
  });
});
