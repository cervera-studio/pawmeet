import { container } from 'tsyringe';
import { api } from '@/lib/trpc';
import { createBufferedAnalyticsService } from '@/services/buffered-analytics-service';
import { createNetworkStateAdapter } from '@/services/network-state-adapter';
import { createNoOpAnalyticsService } from '@/services/noop-analytics-service';
import { createSqliteLocalCache } from '@/services/sqlite-local-cache';
import { createSyncQueueAdapter } from '@/services/sync-queue-adapter';
import { createCompositeBadgeRepository } from './composite/composite-badge-repository';
import { createCompositeChatRepository } from './composite/composite-chat-repository';
import { createCompositeFeedRepository } from './composite/composite-feed-repository';
import { createCompositeFollowRepository } from './composite/composite-follow-repository';
import { createCompositeGamificationRepository } from './composite/composite-gamification-repository';
import { createCompositeGroupChatRepository } from './composite/composite-group-chat-repository';
import { createCompositeGroupEventRepository } from './composite/composite-group-event-repository';
import { createCompositeMatchRepository } from './composite/composite-match-repository';
import { createCompositeWalkRepository } from './composite/composite-walk-repository';
import { createTrpcActivityRepository } from './remote/trpc-activity-repository';
import { createTrpcAuthRepository } from './remote/trpc-auth-repository';
import { createTrpcBadgeRepository } from './remote/trpc-badge-repository';
import { createTrpcChatRepository } from './remote/trpc-chat-repository';
import { createTrpcFeedRepository } from './remote/trpc-feed-repository';
import { createTrpcFeedbackRepository } from './remote/trpc-feedback-repository';
import { createTrpcFollowRepository } from './remote/trpc-follow-repository';
import { createTrpcGamificationRepository } from './remote/trpc-gamification-repository';
import { createTrpcGroupChatRepository } from './remote/trpc-group-chat-repository';
import { createTrpcGroupEventRepository } from './remote/trpc-group-event-repository';
import { createTrpcMatchRepository } from './remote/trpc-match-repository';
import { createTrpcMediaRepository } from './remote/trpc-media-repository';
import { createTrpcMoodLogRepository } from './remote/trpc-mood-log-repository';
import { createTrpcSafetyRepository } from './remote/trpc-safety-repository';
import { createTrpcSmartMatchingRepository } from './remote/trpc-smart-matching-repository';
import { createTrpcUserRepository } from './remote/trpc-user-repository';
import { createTrpcWalkRepository } from './remote/trpc-walk-repository';
import { createTrpcWalkTrackingRepository } from './remote/trpc-walk-tracking-repository';
import {
  ACTIVITY_REPOSITORY,
  ANALYTICS_SERVICE,
  AUTH_REPOSITORY,
  BADGE_REPOSITORY,
  CHAT_REPOSITORY,
  FEED_REPOSITORY,
  FEEDBACK_REPOSITORY,
  FOLLOW_REPOSITORY,
  GAMIFICATION_REPOSITORY,
  GROUP_CHAT_REPOSITORY,
  GROUP_EVENT_REPOSITORY,
  MATCH_REPOSITORY,
  MEDIA_REPOSITORY,
  MOOD_LOG_REPOSITORY,
  SAFETY_REPOSITORY,
  SMART_MATCHING_REPOSITORY,
  USER_REPOSITORY,
  WALK_REPOSITORY,
  WALK_TRACKING_REPOSITORY,
} from './tokens';

// Remote-only repositories (require connectivity, no caching benefit)
container.register(AUTH_REPOSITORY, { useValue: createTrpcAuthRepository(api) });
container.register(WALK_TRACKING_REPOSITORY, {
  useValue: createTrpcWalkTrackingRepository(api),
});
container.register(MEDIA_REPOSITORY, { useValue: createTrpcMediaRepository(api) });
container.register(SAFETY_REPOSITORY, { useValue: createTrpcSafetyRepository(api) });
container.register(FEEDBACK_REPOSITORY, { useValue: createTrpcFeedbackRepository(api) });
container.register(ACTIVITY_REPOSITORY, { useValue: createTrpcActivityRepository(api) });
container.register(USER_REPOSITORY, { useValue: createTrpcUserRepository(api) });
container.register(SMART_MATCHING_REPOSITORY, {
  useValue: createTrpcSmartMatchingRepository(api),
});
container.register(MOOD_LOG_REPOSITORY, { useValue: createTrpcMoodLogRepository(api) });

// Shared infrastructure for composite repositories (injected, not imported)
const localCache = createSqliteLocalCache();
const networkState = createNetworkStateAdapter();
const syncQueue = createSyncQueueAdapter();

// Composite repositories (offline-first with SQLite caching + sync queue)
container.register(CHAT_REPOSITORY, {
  useValue: createCompositeChatRepository({
    remote: createTrpcChatRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(FEED_REPOSITORY, {
  useValue: createCompositeFeedRepository({
    remote: createTrpcFeedRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(GROUP_CHAT_REPOSITORY, {
  useValue: createCompositeGroupChatRepository({
    remote: createTrpcGroupChatRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(GROUP_EVENT_REPOSITORY, {
  useValue: createCompositeGroupEventRepository({
    remote: createTrpcGroupEventRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(WALK_REPOSITORY, {
  useValue: createCompositeWalkRepository({
    remote: createTrpcWalkRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(FOLLOW_REPOSITORY, {
  useValue: createCompositeFollowRepository({
    remote: createTrpcFollowRepository(api),
    cache: localCache,
    network: networkState,
    syncQueue,
  }),
});

container.register(MATCH_REPOSITORY, {
  useValue: createCompositeMatchRepository({
    remote: createTrpcMatchRepository(api),
    cache: localCache,
    network: networkState,
  }),
});

container.register(BADGE_REPOSITORY, {
  useValue: createCompositeBadgeRepository({
    remote: createTrpcBadgeRepository(api),
    cache: localCache,
    network: networkState,
  }),
});

container.register(GAMIFICATION_REPOSITORY, {
  useValue: createCompositeGamificationRepository({
    remote: createTrpcGamificationRepository(api),
    cache: localCache,
    network: networkState,
  }),
});

const analyticsService = __DEV__
  ? createNoOpAnalyticsService()
  : createBufferedAnalyticsService(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');
container.register(ANALYTICS_SERVICE, { useValue: analyticsService });

export { container };
