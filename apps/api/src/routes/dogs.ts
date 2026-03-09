import { Hono } from 'hono';

export const dogRoutes = new Hono()
  .get('/', async (c) => {
    // TODO: list dogs for current user
    return c.json({ message: 'list dogs' });
  })
  .post('/', async (c) => {
    // TODO: create dog profile
    return c.json({ message: 'create dog' });
  })
  .get('/:id', async (c) => {
    // TODO: get dog profile by id
    return c.json({ message: 'get dog' });
  })
  .put('/:id', async (c) => {
    // TODO: update dog profile
    return c.json({ message: 'update dog' });
  })
  .delete('/:id', async (c) => {
    // TODO: delete dog profile
    return c.json({ message: 'delete dog' });
  })
  .post('/:id/photos', async (c) => {
    // TODO: upload dog photo (presigned URL)
    return c.json({ message: 'upload photo' });
  });
