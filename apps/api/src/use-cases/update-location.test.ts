import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUserRepo } from '../test-utils/builders.js';
import { createUpdateLocation } from './update-location.js';

describe('updateLocation', () => {
  it('updates location and returns coordinates with timestamp', async () => {
    const userRepo = buildUserRepo({
      update: vi.fn().mockResolvedValue({} as unknown),
    });
    const updateLocation = createUpdateLocation({ userRepo });

    const result = await updateLocation('user-1', 45.4642, 9.19);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.latitude).toBe(45.4642);
    expect(result.data.longitude).toBe(9.19);
    expect(result.data.updatedAt).toBeDefined();
    expect(userRepo.update).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        latitude: 45.4642,
        longitude: 9.19,
        locationUpdatedAt: expect.any(Date),
      }),
    );
  });
});
