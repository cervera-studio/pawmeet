import { GROUP_EVENT_STATUS, PARTICIPANT_STATUS, isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildDog,
  buildDogRepo,
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createInviteToEvent } from './invite-to-event.js';

function buildDeps(
  overrides: {
    groupEventRepo?: ReturnType<typeof buildGroupEventRepo>;
    userRepo?: ReturnType<typeof buildUserRepo>;
    dogRepo?: ReturnType<typeof buildDogRepo>;
    notificationService?: ReturnType<typeof buildNotificationService>;
  } = {},
) {
  return {
    groupEventRepo: overrides.groupEventRepo ?? buildGroupEventRepo(),
    userRepo: overrides.userRepo ?? buildUserRepo(),
    dogRepo: overrides.dogRepo ?? buildDogRepo(),
    notificationService: overrides.notificationService ?? buildNotificationService(),
  };
}

function buildScheduledEventWithParticipants(
  overrides: Parameters<typeof buildGroupEvent>[0] = {},
  participants: { userId: string; status: string; dogId: string }[] = [],
) {
  return {
    ...buildGroupEvent({
      status: GROUP_EVENT_STATUS.SCHEDULED,
      createdBy: 'user-1',
      maxParticipants: 10,
      ...overrides,
    }),
    participants,
  };
}

describe('inviteToEvent', () => {
  it('successfully invites a user to a scheduled event', async () => {
    const event = buildScheduledEventWithParticipants();
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
      userRepo: buildUserRepo({
        findById: vi.fn().mockResolvedValue(buildUser({ id: 'user-2' })),
      }),
      dogRepo: buildDogRepo({
        findByOwner: vi.fn().mockResolvedValue([buildDog({ id: 'dog-2', ownerId: 'user-2' })]),
      }),
    });
    const invite = createInviteToEvent(deps);

    const result = await invite('user-1', 'event-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Invitation sent');
    expect(deps.groupEventRepo.addParticipant).toHaveBeenCalledWith(
      expect.objectContaining({
        eventId: 'event-1',
        userId: 'user-2',
        dogId: 'dog-2',
        status: PARTICIPANT_STATUS.ACCEPTED,
      }),
    );
    expect(deps.notificationService.send).toHaveBeenCalled();
  });

  it('fails with EVENT_NOT_FOUND when event does not exist', async () => {
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(null),
      }),
    });
    const invite = createInviteToEvent(deps);

    const result = await invite('user-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with NOT_CREATOR when user is not the event creator', async () => {
    const event = buildScheduledEventWithParticipants({ createdBy: 'other-user' });
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    });
    const invite = createInviteToEvent(deps);

    const result = await invite('user-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_CREATOR');
    expect(result.error.status).toBe(403);
  });

  it('fails with ALREADY_PARTICIPANT when user is already a participant', async () => {
    const event = buildScheduledEventWithParticipants({}, [
      { userId: 'user-2', status: PARTICIPANT_STATUS.ACCEPTED, dogId: 'dog-2' },
    ]);
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    });
    const invite = createInviteToEvent(deps);

    const result = await invite('user-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('ALREADY_PARTICIPANT');
    expect(result.error.status).toBe(409);
  });

  it('fails with EVENT_FULL when max capacity is reached', async () => {
    const participants = Array.from({ length: 2 }, (_, i) => ({
      userId: `existing-${i}`,
      status: PARTICIPANT_STATUS.ACCEPTED,
      dogId: `dog-${i}`,
    }));
    const event = buildScheduledEventWithParticipants({ maxParticipants: 2 }, participants);
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    });
    const invite = createInviteToEvent(deps);

    const result = await invite('user-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_FULL');
    expect(result.error.status).toBe(400);
  });
});
