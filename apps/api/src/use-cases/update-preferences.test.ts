import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUserRepo } from '../test-utils/builders.js';
import { createUpdatePreferences } from './update-preferences.js';

describe('createUpdatePreferences', () => {
  it('updates search radius', async () => {
    const deps = { userRepo: buildUserRepo({ update: vi.fn().mockResolvedValue(undefined) }) };
    const updatePrefs = createUpdatePreferences(deps);

    const result = await updatePrefs('user-1', 25);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.searchRadiusKm).toBe(25);
    expect(deps.userRepo.update).toHaveBeenCalledWith('user-1', { searchRadiusKm: 25 });
  });
});
