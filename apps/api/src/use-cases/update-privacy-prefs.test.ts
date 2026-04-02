import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createUpdatePrivacyPrefs } from './update-privacy-prefs.js';

describe('createUpdatePrivacyPrefs', () => {
  it('merges partial prefs with current', async () => {
    const deps = {
      userRepo: buildUserRepo({
        findById: vi
          .fn()
          .mockResolvedValue(
            buildUser({
              privacyPrefs: {
                profileVisible: true,
                approximateDistance: false,
                showLastSeen: true,
              },
            }),
          ),
        update: vi.fn().mockResolvedValue(undefined),
      }),
    };
    const updatePrefs = createUpdatePrivacyPrefs(deps);

    const result = await updatePrefs('user-1', { showLastSeen: false });

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.privacyPrefs.showLastSeen).toBe(false);
    expect(result.data.privacyPrefs.profileVisible).toBe(true);
  });

  it('fails with 404 when user not found', async () => {
    const deps = { userRepo: buildUserRepo({ findById: vi.fn().mockResolvedValue(null) }) };
    const updatePrefs = createUpdatePrivacyPrefs(deps);

    const result = await updatePrefs('user-1', { showLastSeen: false });

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
  });
});
