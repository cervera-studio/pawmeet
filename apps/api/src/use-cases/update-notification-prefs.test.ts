import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createUpdateNotificationPrefs } from './update-notification-prefs.js';

describe('createUpdateNotificationPrefs', () => {
  it('merges partial prefs with current', async () => {
    const deps = {
      userRepo: buildUserRepo({
        findById: vi.fn().mockResolvedValue(
          buildUser({
            notificationPrefs: {
              matches: true,
              messages: true,
              reminders: true,
              feed: true,
              nearby: true,
            },
          }),
        ),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const updatePrefs = createUpdateNotificationPrefs(deps);

    const result = await updatePrefs('user-1', { messages: false });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.notificationPrefs.messages).toBe(false);
    expect(result.data.notificationPrefs.matches).toBe(true);
  });

  it('fails with 404 when user not found', async () => {
    const deps = { userRepo: buildUserRepo({ findById: vi.fn().mockResolvedValue(null) }) };
    const updatePrefs = createUpdateNotificationPrefs(deps);

    const result = await updatePrefs('user-1', { messages: false });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
  });
});
