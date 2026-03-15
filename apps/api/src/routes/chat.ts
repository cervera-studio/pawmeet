import { zValidator } from '@hono/zod-validator';
import { sendMessageSchema } from '@pawmeet/validation';
import { Hono } from 'hono';
import { z } from 'zod';
import type { chatDeps as ChatDeps } from '../container/index.js';
import { handleResult } from '../lib/result.js';
import { uuidParamOrBail } from '../lib/validate-param.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export function createChatRoutes(deps: typeof ChatDeps) {
  return new Hono<Env>()
    .use('/*', authMiddleware)

    .get('/conversations', async (c) => {
      const userId = c.get('userId');
      const result = await deps.listConversations(userId);
      return handleResult(c, result);
    })

    .get('/conversations/:matchId/messages', zValidator('query', paginationSchema), async (c) => {
      const userId = c.get('userId');
      const matchId = uuidParamOrBail(c, 'matchId');
      const { cursor, limit } = c.req.valid('query');
      const result = await deps.getMessages(userId, matchId, cursor, limit);
      return handleResult(c, result);
    })

    .post('/conversations/:matchId/messages', zValidator('json', sendMessageSchema), async (c) => {
      const userId = c.get('userId');
      const matchId = uuidParamOrBail(c, 'matchId');
      const { content, mediaUrl } = c.req.valid('json');
      const result = await deps.sendMessage(userId, matchId, content, mediaUrl);
      return handleResult(c, result, 201);
    })

    .patch('/conversations/:matchId/read', async (c) => {
      const userId = c.get('userId');
      const matchId = uuidParamOrBail(c, 'matchId');
      const result = await deps.markMessagesRead(userId, matchId);
      return handleResult(c, result);
    });
}
