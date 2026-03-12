import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import {
  buildGroupEvent,
  buildGroupEventRepo,
  buildNotificationService,
} from '../test-utils/builders.js';
import { createDeclineParticipant } from './decline-participant.js';

describe('declineParticipant', () => {
  function setup(overrides: {
    participant?: { status: string } | null;
  } = {}) {
    const groupEventRepo = buildGroupEventRepo({
      findById: vi.fn().mockResolvedValue(
        buildGroupEvent({ createdBy: 'host-1', requiresApproval: true }),
      ),
      findParticipant: vi.fn().mockResolvedValue(
        overrides.participant !== undefined
          ? overrides.participant
          : { status: 'pending', userId: 'user-2', eventId: 'event-1' },
      ),
    });
    const notificationService = buildNotificationService();

    const decline = createDeclineParticipant({ groupEventRepo, notificationService });
    return { decline, groupEventRepo, notificationService };
  }

  it('declines pending participant', async () => {
    const { decline, groupEventRepo, notificationService } = setup();

    const result = await decline('host-1', 'event-1', 'user-2');

    expect(isSuccess(result)).toBe(true);
    expect(groupEventRepo.updateParticipantStatus).toHaveBeenCalledWith(
      'event-1',
      'user-2',
      'declined',
    );
    expect(notificationService.send).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2', title: 'Richiesta rifiutata' }),
    );
  });

  it('fails if not organizer', async () => {
    const { decline } = setup();

    const result = await decline('other-user', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_ORGANIZER');
  });

  it('fails if no pending request', async () => {
    const { decline } = setup({ participant: { status: 'accepted' } as any });

    const result = await decline('host-1', 'event-1', 'user-2');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NO_PENDING_REQUEST');
  });
});
