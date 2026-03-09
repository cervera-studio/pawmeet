import { Hono } from 'hono';

export const userRoutes = new Hono()
  .get('/me', async (c) => {
    // TODO: get current user profile
    return c.json({ message: 'get profile' });
  })
  .put('/me', async (c) => {
    // TODO: update current user profile
    return c.json({ message: 'update profile' });
  })
  .put('/me/location', async (c) => {
    // TODO: update user location
    return c.json({ message: 'update location' });
  })
  .put('/me/preferences', async (c) => {
    // TODO: update matching preferences
    return c.json({ message: 'update preferences' });
  })
  .delete('/me', async (c) => {
    // TODO: delete account
    return c.json({ message: 'delete account' });
  });
