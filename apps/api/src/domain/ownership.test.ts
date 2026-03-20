import { AppError } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { checkOwnership } from './ownership.js';

describe('checkOwnership', () => {
  it('returns null when owner matches', () => {
    expect(checkOwnership('user-1', 'user-1', 'NOT_OWNER', 'msg')).toBeNull();
  });

  it('returns AppError when owner does not match', () => {
    const error = checkOwnership('user-1', 'user-2', 'NOT_OWNER', 'Forbidden');
    expect(error).toBeInstanceOf(AppError);
    expect(error).toEqual(expect.objectContaining({ code: 'NOT_OWNER', status: 403 }));
  });
});
