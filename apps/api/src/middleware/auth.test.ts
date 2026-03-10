import { Hono } from 'hono';
import { SignJWT } from 'jose';
import { authMiddleware } from './auth.js';

const JWT_SECRET = new TextEncoder().encode('dev-secret');

function createApp() {
  const app = new Hono();
  app.use('*', authMiddleware);
  app.get('/protected', (c) => c.json({ userId: c.get('userId') }));
  return app;
}

async function signToken(sub: string, options?: { expiresIn?: string; secret?: Uint8Array }) {
  const secret = options?.secret ?? JWT_SECRET;
  let builder = new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuedAt();
  if (options?.expiresIn) {
    builder = builder.setExpirationTime(options.expiresIn);
  }
  return builder.sign(secret);
}

describe('authMiddleware', () => {
  const app = createApp();

  it('returns 401 when Authorization header is missing', async () => {
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header has no Bearer prefix', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic abc123' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when Authorization header is just "Bearer" with no token', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when token is malformed', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid token');
  });

  it('returns 401 when token is signed with a different secret', async () => {
    const wrongSecret = new TextEncoder().encode('wrong-secret');
    const token = await signToken('user-123', { secret: wrongSecret });

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid token');
  });

  it('returns 401 when token is expired', async () => {
    // Create a token that expired 1 hour ago
    const token = await new SignJWT({ type: 'access' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-123')
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(JWT_SECRET);

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid token');
  });

  it('returns 401 when token type is refresh instead of access', async () => {
    const token = await new SignJWT({ type: 'refresh' })
      .setProtectedHeader({ alg: 'HS256' })
      .setSubject('user-123')
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(JWT_SECRET);

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid token');
  });

  it('passes through and sets userId when token is valid', async () => {
    const token = await signToken('user-abc-123');

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-abc-123');
  });

  it('handles tokens with different sub claims', async () => {
    const token = await signToken('another-user-456');

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('another-user-456');
  });

  it('accepts tokens with future expiration', async () => {
    const token = await signToken('user-789', { expiresIn: '1h' });

    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.userId).toBe('user-789');
  });

  it('returns 401 when Bearer prefix has wrong casing', async () => {
    const token = await signToken('user-123');
    const res = await app.request('/protected', {
      headers: { Authorization: `bearer ${token}` },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });
});
