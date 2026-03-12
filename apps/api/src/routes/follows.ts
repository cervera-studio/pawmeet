import {
  blockUserSchema,
  followUserSchema,
  getFollowStatusSchema,
  listFollowsSchema,
  searchUsersSchema,
  unblockUserSchema,
  unfollowUserSchema,
} from '@pawmeet/validation';
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import type { followDeps as FollowDeps } from '../container.js';
import { handleResult } from '../lib/result.js';
import { authMiddleware } from '../middleware/auth.js';

type Env = { Variables: { userId: string } };

export function createFollowRoutes(deps: typeof FollowDeps) {
  return (
    new Hono<Env>()
      .use('/*', authMiddleware)

      // ── Search ──────────────────────────────────────────────────────

      .get('/search', zValidator('query', searchUsersSchema), async (c) => {
        const userId = c.get('userId');
        const { query, limit, offset } = c.req.valid('query');
        const result = await deps.searchUsers(userId, query, limit, offset);
        return handleResult(c, result);
      })

      // ── Status ──────────────────────────────────────────────────────

      .get('/status', zValidator('query', getFollowStatusSchema), async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = c.req.valid('query');
        const result = await deps.getFollowStatus(userId, targetUserId);
        return handleResult(c, result);
      })

      // ── Follows ──────────────────────────────────────────────────────

      .post('/follow', zValidator('json', followUserSchema), async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = c.req.valid('json');
        const result = await deps.followUser(userId, targetUserId);
        return handleResult(c, result, 201);
      })

      .post('/unfollow', zValidator('json', unfollowUserSchema), async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = c.req.valid('json');
        const result = await deps.unfollowUser(userId, targetUserId);
        return handleResult(c, result);
      })

      .get('/followers', zValidator('query', listFollowsSchema), async (c) => {
        const userId = c.get('userId');
        const { userId: targetId, limit, offset } = c.req.valid('query');
        const result = await deps.listFollowers(targetId ?? userId, limit, offset);
        return handleResult(c, result);
      })

      .get('/following', zValidator('query', listFollowsSchema), async (c) => {
        const userId = c.get('userId');
        const { userId: targetId, limit, offset } = c.req.valid('query');
        const result = await deps.listFollowing(targetId ?? userId, limit, offset);
        return handleResult(c, result);
      })

      .get('/friends', zValidator('query', listFollowsSchema), async (c) => {
        const userId = c.get('userId');
        const { userId: targetId, limit, offset } = c.req.valid('query');
        const result = await deps.listFriends(targetId ?? userId, limit, offset);
        return handleResult(c, result);
      })

      // ── Blocks ───────────────────────────────────────────────────────

      .post('/block', zValidator('json', blockUserSchema), async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = c.req.valid('json');
        const result = await deps.blockUser(userId, targetUserId);
        return handleResult(c, result, 201);
      })

      .post('/unblock', zValidator('json', unblockUserSchema), async (c) => {
        const userId = c.get('userId');
        const { targetUserId } = c.req.valid('json');
        const result = await deps.unblockUser(userId, targetUserId);
        return handleResult(c, result);
      })

      .get('/blocked', zValidator('query', listFollowsSchema), async (c) => {
        const userId = c.get('userId');
        const { limit, offset } = c.req.valid('query');
        const result = await deps.listBlocked(userId, limit, offset);
        return handleResult(c, result);
      })
  );
}
