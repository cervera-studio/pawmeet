import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createCompleteOnboarding } from './complete-onboarding.js';

function buildDeps() {
  const user = buildUser({ id: 'usr_1', onboardingCompletedAt: null });
  return {
    userRepo: buildUserRepo({
      findById: vi.fn().mockResolvedValue(user),
      update: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('createCompleteOnboarding', () => {
  it('completes onboarding for a user', async () => {
    const deps = buildDeps();
    const completeOnboarding = createCompleteOnboarding(deps);

    const result = await completeOnboarding('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Onboarding completed');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', {
      onboardingCompletedAt: expect.any(Date),
    });
  });

  it('returns success without updating if already completed', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi
      .fn()
      .mockResolvedValue(buildUser({ onboardingCompletedAt: new Date('2026-01-15') }));
    const completeOnboarding = createCompleteOnboarding(deps);

    const result = await completeOnboarding('usr_1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Onboarding already completed');
    expect(deps.userRepo.update).not.toHaveBeenCalled();
  });

  it('fails with 404 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(null);
    const completeOnboarding = createCompleteOnboarding(deps);

    const result = await completeOnboarding('usr_1');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });
});
