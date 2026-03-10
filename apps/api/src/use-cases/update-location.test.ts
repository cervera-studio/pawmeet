import { isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import type { UserRepository } from '../ports/index.js';
import { createUpdateLocation } from './update-location.js';

function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn().mockResolvedValue({} as any),
    findNearby: vi.fn(),
    ...overrides,
  };
}

describe('updateLocation', () => {
  it('updates location and returns coordinates with timestamp', async () => {
    const userRepo = buildUserRepo();
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
