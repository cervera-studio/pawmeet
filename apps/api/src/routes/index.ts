import { Hono } from 'hono';
import { authDeps, chatDeps, dogDeps, matchDeps, userDeps } from '../container.js';
import { db } from '../lib/db.js';
import { createAdminAuthRoutes } from './admin-auth.js';
import { createAuthRoutes } from './auth.js';
import { createChatRoutes } from './chat.js';
import { createDogRoutes } from './dogs.js';
import { createMatchRoutes } from './matches.js';
import { createUserRoutes } from './users.js';

export const routes = new Hono()
  .route('/auth', createAuthRoutes(authDeps))
  .route('/dogs', createDogRoutes(dogDeps))
  .route('/matches', createMatchRoutes(matchDeps))
  .route('/chat', createChatRoutes(chatDeps))
  .route('/users', createUserRoutes(userDeps))
  .route('/admin/auth', createAdminAuthRoutes(db));

export type AppType = typeof routes;
