import { Hono } from 'hono';

export const authRoutes = new Hono()
  .post('/register', async (c) => {
    // TODO: implement registration
    return c.json({ message: 'register' });
  })
  .post('/login', async (c) => {
    // TODO: implement login
    return c.json({ message: 'login' });
  })
  .post('/refresh', async (c) => {
    // TODO: implement token refresh
    return c.json({ message: 'refresh' });
  });
