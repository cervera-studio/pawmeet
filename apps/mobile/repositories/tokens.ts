import type { AnalyticsService } from '@pawmeet/types';
import type { InjectionToken } from 'tsyringe';
import type {
  ActivityRepository,
  AuthRepository,
  BadgeRepository,
  ChatRepository,
  FeedbackRepository,
  FeedRepository,
  FollowRepository,
  GroupChatRepository,
  GroupEventRepository,
  MatchRepository,
  MediaRepository,
  SmartMatchingRepository,
  UserRepository,
  WalkRepository,
  WalkTrackingRepository,
} from './interfaces';

export const AUTH_REPOSITORY = Symbol('AuthRepository') as InjectionToken<AuthRepository>;
export const MATCH_REPOSITORY = Symbol('MatchRepository') as InjectionToken<MatchRepository>;
export const CHAT_REPOSITORY = Symbol('ChatRepository') as InjectionToken<ChatRepository>;
export const WALK_REPOSITORY = Symbol('WalkRepository') as InjectionToken<WalkRepository>;
export const WALK_TRACKING_REPOSITORY = Symbol(
  'WalkTrackingRepository',
) as InjectionToken<WalkTrackingRepository>;
export const FEED_REPOSITORY = Symbol('FeedRepository') as InjectionToken<FeedRepository>;
export const MEDIA_REPOSITORY = Symbol('MediaRepository') as InjectionToken<MediaRepository>;
export const GROUP_EVENT_REPOSITORY = Symbol(
  'GroupEventRepository',
) as InjectionToken<GroupEventRepository>;
export const GROUP_CHAT_REPOSITORY = Symbol(
  'GroupChatRepository',
) as InjectionToken<GroupChatRepository>;
export const BADGE_REPOSITORY = Symbol('BadgeRepository') as InjectionToken<BadgeRepository>;
export const FEEDBACK_REPOSITORY = Symbol(
  'FeedbackRepository',
) as InjectionToken<FeedbackRepository>;
export const ACTIVITY_REPOSITORY = Symbol(
  'ActivityRepository',
) as InjectionToken<ActivityRepository>;
export const USER_REPOSITORY = Symbol('UserRepository') as InjectionToken<UserRepository>;
export const SMART_MATCHING_REPOSITORY = Symbol(
  'SmartMatchingRepository',
) as InjectionToken<SmartMatchingRepository>;
export const FOLLOW_REPOSITORY = Symbol('FollowRepository') as InjectionToken<FollowRepository>;
export const ANALYTICS_SERVICE = Symbol('AnalyticsService') as InjectionToken<AnalyticsService>;
