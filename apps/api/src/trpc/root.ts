import {
  authDeps,
  badgeDeps,
  chatDeps,
  consentDeps,
  contentModerationDeps,
  dogDeps,
  emergencyContactDeps,
  feedbackDeps,
  feedDeps,
  fitnessDeps,
  followDeps,
  gamificationDeps,
  groupChatDeps,
  groupEventDeps,
  matchDeps,
  matchingAiDeps,
  organizationDeps,
  userDeps,
  walkDeps,
} from '../container.js';
import { db } from '../lib/db.js';
import { createAdminRouter } from './routers/admin.js';
import { createAuthRouter } from './routers/auth.js';
import { createBadgesRouter } from './routers/badges.js';
import { createChatRouter } from './routers/chat.js';
import { createConsentRouter } from './routers/consent.js';
import { createContentModerationRouter } from './routers/content-moderation.js';
import { createDogsRouter } from './routers/dogs.js';
import { createFeedRouter } from './routers/feed.js';
import { createFeedbackRouter } from './routers/feedback.js';
import { createFitnessRouter } from './routers/fitness.js';
import { createFollowsRouter } from './routers/follows.js';
import { createGamificationRouter } from './routers/gamification.js';
import { createGroupChatRouter } from './routers/group-chat.js';
import { createGroupEventsRouter } from './routers/group-events.js';
import { createMatchesRouter } from './routers/matches.js';
import { createMatchingAiRouter } from './routers/matching-ai.js';
import { createOrganizationsRouter } from './routers/organizations.js';
import { createSafetyRouter } from './routers/safety.js';
import { createUsersRouter } from './routers/users.js';
import { createWalksRouter } from './routers/walks.js';
import { router } from './trpc.js';

export const appRouter = router({
  auth: createAuthRouter(authDeps),
  badges: createBadgesRouter(badgeDeps),
  consent: createConsentRouter(consentDeps),
  dogs: createDogsRouter(dogDeps),
  users: createUsersRouter(userDeps),
  matches: createMatchesRouter(matchDeps),
  matchingAi: createMatchingAiRouter(matchingAiDeps),
  chat: createChatRouter(chatDeps),
  admin: createAdminRouter(db),
  walks: createWalksRouter(walkDeps),
  feedback: createFeedbackRouter(feedbackDeps),
  feed: createFeedRouter(feedDeps),
  follows: createFollowsRouter(followDeps),
  fitness: createFitnessRouter(fitnessDeps),
  contentModeration: createContentModerationRouter(contentModerationDeps),
  gamification: createGamificationRouter(gamificationDeps),
  groupChat: createGroupChatRouter(groupChatDeps),
  groupEvents: createGroupEventsRouter(groupEventDeps),
  organizations: createOrganizationsRouter(organizationDeps),
  safety: createSafetyRouter(emergencyContactDeps),
});

export type AppRouter = typeof appRouter;
