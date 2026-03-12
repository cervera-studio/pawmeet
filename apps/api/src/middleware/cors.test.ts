import { Hono } from 'hono';
import { corsMiddleware } from './cors.js';

function createApp() {
  const app = new Hono();
  app.use('*', corsMiddleware);
  app.get('/test', (c) => c.json({ ok: true }));
  return app;
}

describe('corsMiddleware', () => {
  const app = createApp();

  // In test/dev environment, only development origins are allowed
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:4321',
  ];

  const blockedOrigins = [
    'http://localhost:8080',
    'https://evil.com',
    'https://pawmeet.io.evil.com',
    'https://notpawmeet.io',
    'https://pawmeet.io',
    'https://den.pawmeet.io',
  ];

  it.each(allowedOrigins)('allows requests from %s', async (origin) => {
    const res = await app.request('/test', {
      headers: { Origin: origin },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });

  it.each(blockedOrigins)('blocks requests from %s', async (origin) => {
    const res = await app.request('/test', {
      headers: { Origin: origin },
    });
    expect(res.headers.get('Access-Control-Allow-Origin')).not.toBe(origin);
  });

  it('includes credentials support', async () => {
    const res = await app.request('/test', {
      headers: { Origin: 'http://localhost:3000' },
    });
    expect(res.headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('handles preflight OPTIONS requests for allowed origins', async () => {
    const res = await app.request('/test', {
      method: 'OPTIONS',
      headers: {
        Origin: 'http://localhost:3000',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });
    // Preflight should return 204 or 200
    expect(res.status).toBeLessThanOrEqual(204);
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
  });

  it('does not set allow-origin header when no Origin is sent', async () => {
    const res = await app.request('/test');
    expect(res.status).toBe(200);
    // Without an Origin header, CORS headers should not be set
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
