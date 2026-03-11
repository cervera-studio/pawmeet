import { swipeSchema } from '@dogwalk/validation';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import type { matchDeps as MatchDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { authMiddleware } from '../middleware/auth.js';
import { uuidParamOrBail } from '../lib/validate-param.js';

type Env = { Variables: { userId: string } };

const discoverQuerySchema = z.object({
  dogId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export function createMatchRoutes(deps: typeof MatchDeps) {
  return new Hono<Env>()
    .use('/*', authMiddleware)

    .get('/', async (c) => {
      const userId = c.get('userId');
      const result = await deps.listMatches(userId);
      return handleResult(c, result);
    })

    .get('/discover', zValidator('query', discoverQuerySchema), async (c) => {
      const userId = c.get('userId');
      const { dogId, limit } = c.req.valid('query');
      const result = await deps.discoverCandidates(userId, dogId, limit);
      return handleResult(c, result);
    })

    .post('/like', zValidator('json', swipeSchema), async (c) => {
      const userId = c.get('userId');
      const { dogId, targetDogId } = c.req.valid('json');
      const result = await deps.likeDog(userId, dogId, targetDogId);
      return handleResult(c, result, 201);
    })

    .post('/pass', zValidator('json', swipeSchema), async (c) => {
      const userId = c.get('userId');
      const { dogId, targetDogId } = c.req.valid('json');
      const result = await deps.passDog(userId, dogId, targetDogId);
      return handleResult(c, result);
    })

    .delete('/:id', async (c) => {
      const userId = c.get('userId');
      const matchId = uuidParamOrBail(c, 'id');
      const result = await deps.unmatch(userId, matchId);
      return handleResult(c, result);
    });
}
