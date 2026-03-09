import { Hono } from 'hono';

export const matchRoutes = new Hono()
  .get('/', async (c) => {
    // TODO: list matches for current user
    return c.json({ message: 'list matches' });
  })
  .get('/discover', async (c) => {
    // TODO: get nearby dogs for swiping/matching
    return c.json({ message: 'discover' });
  })
  .post('/like', async (c) => {
    // TODO: like a dog profile
    return c.json({ message: 'like' });
  })
  .post('/pass', async (c) => {
    // TODO: pass on a dog profile
    return c.json({ message: 'pass' });
  })
  .delete('/:id', async (c) => {
    // TODO: unmatch
    return c.json({ message: 'unmatch' });
  });
