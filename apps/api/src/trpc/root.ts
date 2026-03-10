import {
  authDeps,
  badgeDeps,
  chatDeps,
  dogDeps,
  feedbackDeps,
  groupChatDeps,
  groupEventDeps,
  matchDeps,
  userDeps,
  walkDeps,
} from '../container.js';
import { db } from '../lib/db.js';
import { createAdminRouter } from './routers/admin.js';
import { createAuthRouter } from './routers/auth.js';
import { createBadgesRouter } from './routers/badges.js';
import { createChatRouter } from './routers/chat.js';
import { createDogsRouter } from './routers/dogs.js';
import { createFeedbackRouter } from './routers/feedback.js';
import { createGroupChatRouter } from './routers/group-chat.js';
import { createGroupEventsRouter } from './routers/group-events.js';
import { createMatchesRouter } from './routers/matches.js';
import { createUsersRouter } from './routers/users.js';
import { createWalksRouter } from './routers/walks.js';
import { router } from './trpc.js';

export const appRouter = router({
  auth: createAuthRouter(authDeps),
  badges: createBadgesRouter(badgeDeps),
  dogs: createDogsRouter(dogDeps),
  users: createUsersRouter(userDeps),
  matches: createMatchesRouter(matchDeps),
  chat: createChatRouter(chatDeps),
  admin: createAdminRouter(db),
  walks: createWalksRouter(walkDeps),
  feedback: createFeedbackRouter(feedbackDeps),
  groupChat: createGroupChatRouter(groupChatDeps),
  groupEvents: createGroupEventsRouter(groupEventDeps),
});

export type AppRouter = typeof appRouter;
