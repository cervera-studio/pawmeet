import { handleError } from './error-handler';

const FALLBACK = 'Errore generico';

describe('handleError', () => {
  it('returns the Error message when it has a useful message', () => {
    const error = new Error('User not found');
    expect(handleError(error, FALLBACK)).toBe('User not found');
  });

  it('returns fallback when Error.message is "undefined"', () => {
    const error = new Error('undefined');
    expect(handleError(error, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback when Error.message is empty', () => {
    const error = new Error('');
    expect(handleError(error, FALLBACK)).toBe(FALLBACK);
  });

  it('returns the string directly when error is a non-empty string', () => {
    expect(handleError('Something went wrong', FALLBACK)).toBe('Something went wrong');
  });

  it('returns fallback when error is an empty string', () => {
    expect(handleError('', FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for null', () => {
    expect(handleError(null, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for undefined', () => {
    expect(handleError(undefined, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for a number', () => {
    expect(handleError(42, FALLBACK)).toBe(FALLBACK);
  });

  it('returns fallback for a plain object', () => {
    expect(handleError({ code: 'ERR' }, FALLBACK)).toBe(FALLBACK);
  });

  it('extracts message from a subclass of Error (tRPC-like)', () => {
    class TRPCError extends Error {
      code: string;
      constructor(message: string, code: string) {
        super(message);
        this.code = code;
      }
    }
    const error = new TRPCError('NOT_FOUND', 'NOT_FOUND');
    expect(handleError(error, FALLBACK)).toBe('NOT_FOUND');
  });
});
