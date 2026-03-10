import { authDeps, chatDeps, dogDeps, matchDeps, userDeps, walkDeps } from '../container.js';
import { db } from '../lib/db.js';
import { createAdminRouter } from './routers/admin.js';
import { createAuthRouter } from './routers/auth.js';
import { createChatRouter } from './routers/chat.js';
import { createDogsRouter } from './routers/dogs.js';
import { createMatchesRouter } from './routers/matches.js';
import { createUsersRouter } from './routers/users.js';
import { createWalksRouter } from './routers/walks.js';
import { router } from './trpc.js';

export const appRouter = router({
  auth: createAuthRouter(authDeps),
  dogs: createDogsRouter(dogDeps),
  users: createUsersRouter(userDeps),
  matches: createMatchesRouter(matchDeps),
  chat: createChatRouter(chatDeps),
  admin: createAdminRouter(db),
  walks: createWalksRouter(walkDeps),
});

export type AppRouter = typeof appRouter;
