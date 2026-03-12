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
import { createRequestJoinEvent } from './request-join-event.js';

describe('requestJoinEvent', () => {
  const _defaultEvent = buildGroupEvent({ createdBy: 'host-1' });

  function setup(
    overrides: {
      event?: ReturnType<typeof buildGroupEvent> | null;
      requiresApproval?: boolean;
      existingParticipant?: { status: string } | null;
      count?: number;
      areFriends?: boolean;
      visibility?: string;
    } = {},
  ) {
    const event =
      overrides.event !== undefined
        ? overrides.event
        : buildGroupEvent({
            createdBy: 'host-1',
            requiresApproval: overrides.requiresApproval ?? false,
            visibility: (overrides.visibility as any) ?? 'public',
          });

    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(event),
      findParticipant: vi.fn().mockResolvedValue(overrides.existingParticipant ?? null),
      countParticipants: vi.fn().mockResolvedValue(overrides.count ?? 2),
    });
    const dogRepo = buildDogRepo({
      findByIdAndOwner: vi.fn().mockResolvedValue(buildDog()),
    });
    const followRepo = buildFollowRepo({
      areFriends: vi.fn().mockResolvedValue(overrides.areFriends ?? true),
    });
    const notificationService = buildNotificationService();

    const requestJoin = createRequestJoinEvent({
      groupEventRepo,
      dogRepo,
      followRepo,
      notificationService,
    });

    return { requestJoin, groupEventRepo, notificationService };
  }

  it('joins directly when requiresApproval is false', async () => {
    const { requestJoin, groupEventRepo } = setup({ requiresApproval: false });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'accepted' }),
    );
  });

  it('creates pending request when requiresApproval is true', async () => {
    const { requestJoin, groupEventRepo } = setup({ requiresApproval: true });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'pending' }),
    );
  });

  it('notifies host on join request', async () => {
    const { requestJoin, notificationService } = setup({ requiresApproval: true });

    await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'host-1',
        title: 'Nuova richiesta',
      }),
    );
  });

  it('blocks non-friends from friends_only events', async () => {
    const { requestJoin } = setup({ visibility: 'friends_only', areFriends: false });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_FRIENDS_ONLY');
  });

  it('allows friends to join friends_only events', async () => {
    const { requestJoin } = setup({ visibility: 'friends_only', areFriends: true });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isSuccess(result)).toBe(true);
  });

  it('fails when event is full', async () => {
    const { requestJoin } = setup({ count: 10 });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_FULL');
  });

  it('fails when already joined', async () => {
    const { requestJoin } = setup({
      existingParticipant: { status: 'accepted' } as any,
    });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_JOINED');
  });

  it('fails when event not found', async () => {
    const { requestJoin } = setup({ event: null });

    const result = await requestJoin('user-2', { eventId: 'event-1', dogId: 'dog-2' });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
  });
});
