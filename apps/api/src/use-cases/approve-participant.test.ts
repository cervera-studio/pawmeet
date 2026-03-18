import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createApproveParticipant } from './approve-participant.js';

describe('approveParticipant', () => {
  function setup(
    overrides: {
      event?: ReturnType<typeof buildGroupEvent> | null;
      participant?: { status: string } | null;
    } = {},
  ) {
    const event =
      overrides.event === undefined
        ? buildGroupEvent({ createdBy: 'host-1', requiresApproval: true })
        : overrides.event;

    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(event),
      findParticipant: vi
        .fn()
        .mockResolvedValue(
          overrides.participant === undefined
            ? { status: 'pending', userId: 'user-2', eventId: 'event-1' }
            : overrides.participant,
        ),
    });
    const notificationService = buildNotificationService();

    const approve = createApproveParticipant({ groupEventRepo, notificationService });
    return { approve, groupEventRepo, notificationService };
  }

  it('approves pending participant', async () => {
    const { approve, groupEventRepo, notificationService } = setup();

    const result = await approve('host-1', 'event-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.updateParticipantStatus).toHaveBeenCalledWith(
      'event-1',
      'user-2',
      'accepted',
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', title: 'Richiesta approvata' }),
    );
  });

  it('fails if not organizer', async () => {
    const { approve } = setup();

    const result = await approve('other-user', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_ORGANIZER');
  });

  it('fails if no pending request', async () => {
    const { approve } = setup({ participant: null });

    const result = await approve('host-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_PENDING_REQUEST');
  });
});
