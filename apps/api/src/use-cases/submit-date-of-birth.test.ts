import { MIN_USER_AGE } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildUser, buildUserRepo } from '../test-utils/builders.js';
import { createSubmitDateOfBirth } from './submit-date-of-birth.js';

function buildDeps() {
  return {
    userRepo: buildUserRepo({
      findById: vi.fn().mockResolvedValue(buildUser({ dateOfBirth: null })),
      update: vi.fn().mockResolvedValue(undefined),
    }),
  };
}

describe('createSubmitDateOfBirth', () => {
  const adultDob = new Date('1995-06-15');

  it('saves date of birth for an adult user', async () => {
    const deps = buildDeps();
    const submitDob = createSubmitDateOfBirth(deps);

    const result = await submitDob('usr_1', adultDob);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.message).toBe('Date of birth updated');
    expect(deps.userRepo.update).toHaveBeenCalledWith('usr_1', { dateOfBirth: adultDob });
  });

  it('fails with 404 when user not found', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi.fn().mockResolvedValue(null);
    const submitDob = createSubmitDateOfBirth(deps);

    const result = await submitDob('usr_1', adultDob);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('fails with 409 when date of birth already set', async () => {
    const deps = buildDeps();
    deps.userRepo.findById = vi
      .fn()
      .mockResolvedValue(buildUser({ dateOfBirth: new Date('1990-01-01') }));
    const submitDob = createSubmitDateOfBirth(deps);

    const result = await submitDob('usr_1', adultDob);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AGE_ALREADY_VERIFIED');
    expect(result.error.status).toBe(409);
  });

  it('fails with 403 when user is underage', async () => {
    const deps = buildDeps();
    const submitDob = createSubmitDateOfBirth(deps);

    // Born 10 years ago — clearly under MIN_USER_AGE (18)
    const underageDob = new Date();
    underageDob.setFullYear(underageDob.getFullYear() - 10);

    const result = await submitDob('usr_1', underageDob);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('AGE_VERIFICATION_FAILED');
    expect(result.error.status).toBe(403);
    expect(result.error.message).toContain(`${MIN_USER_AGE}`);
  });
});
