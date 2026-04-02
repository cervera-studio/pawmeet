import { getAccessToken, hasRefreshCookie, setAccessToken } from './auth-store';

describe('accessToken module-level state', () => {
  afterEach(() => {
    setAccessToken(null);
  });

  it('returns null by default', () => {
    expect(getAccessToken()).toBeNull();
  });

  it('stores and retrieves a token', () => {
    setAccessToken('jwt-token-123');
    expect(getAccessToken()).toBe('jwt-token-123');
  });

  it('clears the token when set to null', () => {
    setAccessToken('jwt-token-123');
    setAccessToken(null);
    expect(getAccessToken()).toBeNull();
  });

  it('overwrites previous token', () => {
    setAccessToken('old-token');
    setAccessToken('new-token');
    expect(getAccessToken()).toBe('new-token');
  });
});

describe('hasRefreshCookie', () => {
  it('returns false when document is undefined (SSR)', () => {
    const originalDocument = globalThis.document;
    // @ts-expect-error -- simulating SSR
    delete globalThis.document;
    expect(hasRefreshCookie()).toBe(false);
    globalThis.document = originalDocument;
  });
});
