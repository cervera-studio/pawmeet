import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { clearHandlers } from '../domain/events.js';
import { buildGroupMessage, buildGroupMessageRepo } from '../test-utils/builders.js';
import { createSendGroupMessage } from './send-group-message.js';

describe('sendGroupMessage', () => {
  afterEach(() => clearHandlers());

  it('creates a message and returns success', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      create: vi.fn().mockResolvedValue(buildGroupMessage({ content: 'Ciao a tutti!' })),
      getParticipantUserIds: vi.fn().mockResolvedValue(['user-1', 'user-2', 'user-3']),
    });
    const send = createSendGroupMessage({ groupMessageRepo });

    const result = await send('user-1', 'event-1', 'Ciao a tutti!');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message.content).toBe('Ciao a tutti!');
  });

  it('fails when user is not a participant', async () => {
    const groupMessageRepo = buildGroupMessageRepo({
      isEventParticipant: vi.fn().mockResolvedValue(false),
    });
    const send = createSendGroupMessage({ groupMessageRepo });

    const result = await send('user-99', 'event-1', 'Ciao');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
  });
});
