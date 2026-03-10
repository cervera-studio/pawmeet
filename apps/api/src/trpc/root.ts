import { authDeps, chatDeps, dogDeps, matchDeps, userDeps } from '../container.js';
import { createAuthRouter } from './routers/auth.js';
import { createChatRouter } from './routers/chat.js';
import { createDogsRouter } from './routers/dogs.js';
import { createMatchesRouter } from './routers/matches.js';
import { createUsersRouter } from './routers/users.js';
import { router } from './trpc.js';

export const appRouter = router({
  auth: createAuthRouter(authDeps),
  dogs: createDogsRouter(dogDeps),
  users: createUsersRouter(userDeps),
  matches: createMatchesRouter(matchDeps),
  chat: createChatRouter(chatDeps),
});

export type AppRouter = typeof appRouter;
