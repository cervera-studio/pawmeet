import { AppError } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { assertOwnership } from './ownership.js';

describe('assertOwnership', () => {
  it('passes when owner matches', () => {
    expect(() => assertOwnership('user-1', 'user-1', 'NOT_OWNER', 'msg')).not.toThrow();
  });

  it('throws AppError when owner does not match', () => {
    expect(() => assertOwnership('user-1', 'user-2', 'NOT_OWNER', 'Forbidden')).toThrow(AppError);
    expect(() => assertOwnership('user-1', 'user-2', 'NOT_OWNER', 'Forbidden')).toThrow(
      expect.objectContaining({ code: 'NOT_OWNER', status: 403 }),
    );
  });
});
