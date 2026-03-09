import { Hono } from 'hono';

export const chatRoutes = new Hono()
  .get('/', async (c) => {
    // TODO: list chat conversations for current user
    return c.json({ message: 'list conversations' });
  })
  .get('/:matchId/messages', async (c) => {
    // TODO: get messages for a match conversation
    return c.json({ message: 'list messages' });
  })
  .post('/:matchId/messages', async (c) => {
    // TODO: send a message in a conversation
    return c.json({ message: 'send message' });
  })
  .put('/:matchId/read', async (c) => {
    // TODO: mark conversation as read
    return c.json({ message: 'mark read' });
  });
