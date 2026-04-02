import { AppError, fail, succeed } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { handleResult } from './result.js';

function createMockContext() {
  const jsonFn = vi.fn((_data: unknown, status: number) => ({ status, body: _data }));
  return { json: jsonFn } as unknown as Parameters<typeof handleResult>[0];
}

describe('result', () => {
  describe('handleResult', () => {
    it('returns success data with 200 status by default', () => {
      const c = createMockContext();
      const result = succeed({ id: '1', name: 'Rex' });

      handleResult(c, result);

      expect(c.json).toHaveBeenCalledWith({ id: '1', name: 'Rex' }, 200);
    });

    it('returns success data with custom 201 status', () => {
      const c = createMockContext();
      const result = succeed({ id: '2' });

      handleResult(c, result, 201);

      expect(c.json).toHaveBeenCalledWith({ id: '2' }, 201);
    });

    it('returns error with AppError status on failure', () => {
      const c = createMockContext();
      const result = fail(new AppError('DOG_NOT_FOUND', 'Dog not found', 404));

      handleResult(c, result);

      expect(c.json).toHaveBeenCalledWith({ error: 'Dog not found', code: 'DOG_NOT_FOUND' }, 404);
    });

    it('returns 400 for validation errors', () => {
      const c = createMockContext();
      const result = fail(new AppError('INVALID_INPUT', 'Invalid input', 400));

      handleResult(c, result);

      expect(c.json).toHaveBeenCalledWith({ error: 'Invalid input', code: 'INVALID_INPUT' }, 400);
    });
  });
});
