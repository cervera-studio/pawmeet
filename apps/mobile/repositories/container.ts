import { container } from 'tsyringe';
import { api } from '@/lib/trpc';
import { createBufferedAnalyticsService } from '@/services/buffered-analytics-service';
import { createNoOpAnalyticsService } from '@/services/noop-analytics-service';
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
  SMART_MATCHING_REPOSITORY,
  USER_REPOSITORY,
  WALK_REPOSITORY,
  WALK_TRACKING_REPOSITORY,
} from './tokens';

container.register(AUTH_REPOSITORY, { useValue: createTrpcAuthRepository(api) });
container.register(MATCH_REPOSITORY, { useValue: createTrpcMatchRepository(api) });
container.register(CHAT_REPOSITORY, { useValue: createTrpcChatRepository(api) });
container.register(WALK_REPOSITORY, { useValue: createTrpcWalkRepository(api) });
container.register(WALK_TRACKING_REPOSITORY, {
  useValue: createTrpcWalkTrackingRepository(api),
});
container.register(FEED_REPOSITORY, { useValue: createTrpcFeedRepository(api) });
container.register(FOLLOW_REPOSITORY, { useValue: createTrpcFollowRepository(api) });
container.register(MEDIA_REPOSITORY, { useValue: createTrpcMediaRepository(api) });
container.register(GROUP_EVENT_REPOSITORY, {
  useValue: createTrpcGroupEventRepository(api),
});
container.register(GROUP_CHAT_REPOSITORY, {
  useValue: createTrpcGroupChatRepository(api),
});
container.register(BADGE_REPOSITORY, { useValue: createTrpcBadgeRepository(api) });
container.register(FEEDBACK_REPOSITORY, { useValue: createTrpcFeedbackRepository(api) });
container.register(ACTIVITY_REPOSITORY, { useValue: createTrpcActivityRepository(api) });
container.register(USER_REPOSITORY, { useValue: createTrpcUserRepository(api) });
container.register(SMART_MATCHING_REPOSITORY, {
  useValue: createTrpcSmartMatchingRepository(api),
});
container.register(GAMIFICATION_REPOSITORY, {
  useValue: createTrpcGamificationRepository(api),
});

const analyticsService = __DEV__
  ? createNoOpAnalyticsService()
  : createBufferedAnalyticsService(process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000');
container.register(ANALYTICS_SERVICE, { useValue: analyticsService });

export { container };
