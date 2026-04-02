import { GROUP_EVENT_STATUS, PARTICIPANT_STATUS, isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGroupEvent,
  buildGroupEventRepo,
  buildUser,
  buildUserRepo,
} from '../test-utils/builders.js';
import { createGetEventRecap } from './get-event-recap.js';

function buildDeps(
  overrides: {
    groupEventRepo?: ReturnType<typeof buildGroupEventRepo>;
    userRepo?: ReturnType<typeof buildUserRepo>;
  } = {},
) {
  return {
    groupEventRepo: overrides.groupEventRepo ?? buildGroupEventRepo(),
    userRepo: overrides.userRepo ?? buildUserRepo(),
  };
}

function buildCompletedEvent(
  overrides: Parameters<typeof buildGroupEvent>[0] = {},
  participants: { userId: string; status: string; dogId: string }[] = [],
) {
  return {
    ...buildGroupEvent({
      status: GROUP_EVENT_STATUS.COMPLETED,
      createdBy: 'user-1',
      ...overrides,
    }),
    participants,
  };
}

describe('getEventRecap', () => {
  it('returns recap for a completed event when user is a participant', async () => {
    const participants = [
      { userId: 'user-1', status: PARTICIPANT_STATUS.ACCEPTED, dogId: 'dog-1' },
      { userId: 'user-2', status: PARTICIPANT_STATUS.ACCEPTED, dogId: 'dog-2' },
    ];
    const event = buildCompletedEvent({}, participants);
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
      userRepo: buildUserRepo({
        findByIds: vi
          .fn()
          .mockResolvedValue([
            buildUser({ id: 'user-1', displayName: 'Mario' }),
            buildUser({ id: 'user-2', displayName: 'Luca' }),
          ]),
      }),
    });
    const getRecap = createGetEventRecap(deps);

    const result = await getRecap('user-1', 'event-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.eventId).toBe('event-1');
    expect(result.data.totalParticipants).toBe(2);
    expect(result.data.participants).toHaveLength(2);
  });

  it('fails with EVENT_NOT_FOUND when event does not exist', async () => {
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(null),
      }),
    });
    const getRecap = createGetEventRecap(deps);

    const result = await getRecap('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with EVENT_NOT_COMPLETED when event is not completed', async () => {
    const event = {
      ...buildGroupEvent({ status: GROUP_EVENT_STATUS.SCHEDULED, createdBy: 'user-1' }),
      participants: [],
    };
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    });
    const getRecap = createGetEventRecap(deps);

    const result = await getRecap('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('EVENT_NOT_COMPLETED');
    expect(result.error.status).toBe(400);
  });

  it('fails with NOT_PARTICIPANT when user is not a participant or creator', async () => {
    const event = buildCompletedEvent({ createdBy: 'other-user' }, [
      { userId: 'other-user', status: PARTICIPANT_STATUS.ACCEPTED, dogId: 'dog-1' },
    ]);
    const deps = buildDeps({
      groupEventRepo: buildGroupEventRepo({
        findByIdWithParticipants: vi.fn().mockResolvedValue(event),
      }),
    });
    const getRecap = createGetEventRecap(deps);

    const result = await getRecap('user-1', 'event-1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
    expect(result.error.status).toBe(403);
  });
});
