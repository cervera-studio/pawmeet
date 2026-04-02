import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUserRepo } from '../test-utils/builders.js';
import { createRegisterPushToken } from './register-push-token.js';

describe('createRegisterPushToken', () => {
  it('registers a valid Expo push token', async () => {
    const userRepo = buildUserRepo({
      updatePushToken: vi.fn().mockResolvedValue(undefined),
    });
    const execute = createRegisterPushToken({ userRepo });

    const result = await execute('user-1', 'ExponentPushToken[abc123]');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.registered).toBe(true);
    expect(userRepo.updatePushToken).toHaveBeenCalledWith('user-1', 'ExponentPushToken[abc123]');
  });

  it('rejects an invalid push token with 400', async () => {
    const userRepo = buildUserRepo();
    const execute = createRegisterPushToken({ userRepo });

    const result = await execute('user-1', 'not-a-valid-token');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.status).toBe(400);
    expect(result.error.code).toBe('INVALID_PUSH_TOKEN');
  });
});
