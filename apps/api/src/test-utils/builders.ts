import type { AchievementType } from '@dogwalk/config';
import { ACHIEVEMENT_TYPE, CHALLENGE_TYPE } from '@dogwalk/config';
import {
  type Achievement,
  BADGE_TYPE,
  type Badge,
  type BadgeType,
  type Challenge,
  type ChatMessage,
  type ContentReport,
  type DailyActivity,
  type DogProfile,
  type GroupChatMessage,
  type GroupEvent,
  type Match,
  type Post,
  type PostComment,
  type PostMedia,
  type Story,
  type Swipe,
  type User,
  type UserChallenge,
  type Walk,
  type WalkAlbum,
  type WalkFeedback,
  type WalkTrack,
  type WalkTrackPoint,
} from '@dogwalk/types';
import { vi } from 'vitest';
import type { ActivityRepository } from '../ports/activity-repository.js';
import type { ExperimentService } from '../ports/experiment-service.js';
import type { GamificationRepository } from '../ports/gamification-repository.js';
import type {
  AuthService,
  BadgeRepository,
  CandidateDog,
  ChatService,
  ContentReportRepository,
  CreateDogInput,
  DogRepository,
  EmailService,
  FeedbackRepository,
  FeedRepository,
  GroupEventRepository,
  GroupMessageRepository,
  MatchRepository,
  MessageRepository,
  NotificationService,
  StorageService,
  StoryRepository,
  TokenRepository,
  UserRepository,
  WalkAlbumRepository,
  WalkRepository,
  WalkTrackRepository,
} from '../ports/index.js';
import type { MatchingAiRepository } from '../ports/matching-ai-repository.js';

// ── Entity builders ──────────────────────────────────────────────────────────

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    passwordHash: '$2b$12$hash',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    locationUpdatedAt: new Date('2026-03-01'),
    searchRadiusKm: 50,
    emailVerified: true,
    pushToken: null,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    isActive: true,
    createdAt: new Date('2026-01-01'),
    lastLoginAt: null,
    ...overrides,
  };
}

export function buildDog(overrides: Partial<DogProfile> = {}): DogProfile {
  return {
    id: 'dog-1',
    ownerId: 'user-1',
    name: 'Rex',
    birthDate: new Date('2022-01-01'),
    breed: 'Labrador',
    breedSecondary: null,
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    recallReliability: 'affidabile',
    bio: null,
    walkPrefTime: ['mattina', 'pomeriggio'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco', 'urbano'],
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  };
}

export function buildDogInput(): Omit<CreateDogInput, 'ownerId'> {
  return {
    name: 'Fido',
    birthDate: new Date('2022-03-15'),
    breed: 'labrador',
    size: 'grande',
    weightKg: 30,
    gender: 'maschio',
    isNeutered: true,
    energyLevel: 'alta',
    behaviorWithDogs: 'socievole',
    behaviorWithPeople: 'molto_socievole',
    leashBehavior: 'buono',
    walkPrefTime: ['mattina'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['parco'],
  };
}

export function buildMatch(overrides: Partial<Match> = {}): Match {
  return {
    id: 'match-1',
    dogAId: 'dog-1',
    dogBId: 'dog-2',
    compatibilityScore: 0.85,
    createdAt: new Date('2026-03-01'),
    isActive: true,
    ...overrides,
  };
}

export function buildSwipe(overrides: Partial<Swipe> = {}): Swipe {
  return {
    id: 'swipe-1',
    swiperDogId: 'dog-2',
    swipedDogId: 'dog-1',
    direction: 'like',
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildWalk(overrides: Partial<Walk> = {}): Walk {
  return {
    id: 'walk-1',
    matchId: 'match-1',
    createdBy: 'user-1',
    title: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 30,
    location: null,
    latitude: null,
    longitude: null,
    status: 'pending',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildGroupEvent(overrides: Partial<GroupEvent> = {}): GroupEvent {
  return {
    id: 'event-1',
    createdBy: 'user-1',
    title: 'Passeggiata al parco',
    description: null,
    scheduledAt: new Date('2027-06-15T10:00:00Z'),
    durationMin: 60,
    location: 'Parco Sempione',
    latitude: 45.4729,
    longitude: 9.1797,
    maxParticipants: 10,
    visibility: 'public',
    status: 'scheduled',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export function buildFeedback(overrides: Partial<WalkFeedback> = {}): WalkFeedback {
  return {
    id: 'feedback-1',
    walkId: 'walk-1',
    fromUserId: 'user-1',
    toDogId: 'dog-2',
    rating: 4 as 1 | 2 | 3 | 4 | 5,
    comment: null,
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    senderId: 'user-1',
    content: 'Ciao!',
    mediaUrl: null,
    status: 'sent',
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildGroupMessage(overrides: Partial<GroupChatMessage> = {}): GroupChatMessage {
  return {
    id: 'gmsg-1',
    eventId: 'event-1',
    senderId: 'user-1',
    content: 'Ciao gruppo!',
    mediaUrl: null,
    isDeleted: false,
    createdAt: new Date(),
    ...overrides,
  };
}

export function buildBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: 'badge-1',
    dogId: 'dog-1',
    type: BADGE_TYPE.FIRST_MEETING,
    awardedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildAchievement(overrides: Partial<Achievement> = {}): Achievement {
  return {
    id: 'ach-1',
    userId: 'user-1',
    type: ACHIEVEMENT_TYPE.FIRST_WALK,
    unlockedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildChallenge(overrides: Partial<Challenge> = {}): Challenge {
  return {
    id: 'challenge-1',
    type: CHALLENGE_TYPE.WALK_COUNT,
    title: 'Cammina 5 volte',
    description: 'Completa 5 passeggiate questa settimana',
    targetValue: 5,
    xpReward: 100,
    startsAt: new Date('2026-03-01'),
    endsAt: new Date('2026-03-31'),
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildUserChallenge(overrides: Partial<UserChallenge> = {}): UserChallenge {
  return {
    id: 'uc-1',
    userId: 'user-1',
    challengeId: 'challenge-1',
    progress: 0,
    completedAt: null,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildCandidate(overrides: Partial<CandidateDog> = {}): CandidateDog {
  return {
    dog: buildDog({
      id: 'dog-2',
      ownerId: 'user-2',
      name: 'Bella',
      size: 'grande',
      energyLevel: 'alta',
      behaviorWithDogs: 'socievole',
      leashBehavior: 'buono',
      walkPrefTime: ['mattina', 'pomeriggio'],
      walkPrefDurationMin: 30,
      walkPrefDurationMax: 60,
      walkPrefTerrain: ['parco', 'urbano'],
    }),
    ownerLat: 41.91,
    ownerLon: 12.5,
    ...overrides,
  };
}

// ── Repository builders ──────────────────────────────────────────────────────

export function buildUserRepo(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    findByIds: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findNearby: vi.fn(),
    updatePushToken: vi.fn(),
    findPushToken: vi.fn(),
    ...overrides,
  };
}

export function buildDogRepo(overrides: Partial<DogRepository> = {}): DogRepository {
  return {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByOwner: vi.fn(),
    findByIdAndOwner: vi.fn(),
    countByOwner: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    findPhotos: vi.fn(),
    countPhotos: vi.fn(),
    addPhoto: vi.fn(),
    findPhoto: vi.fn(),
    deletePhoto: vi.fn(),
    updatePhotoPositions: vi.fn(),
    findPhotoById: vi.fn(),
    updatePhotoModerationStatus: vi.fn(),
    ...overrides,
  };
}

export function buildMatchRepo(overrides: Partial<MatchRepository> = {}): MatchRepository {
  return {
    findActiveByDogIds: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    softDelete: vi.fn(),
    findSwipedDogIds: vi.fn().mockResolvedValue([]),
    countDailySwipes: vi.fn(),
    findSwipe: vi.fn(),
    findReciprocalLike: vi.fn(),
    createSwipe: vi.fn(),
    findCandidateDogs: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function buildWalkRepo(overrides: Partial<WalkRepository> = {}): WalkRepository {
  return {
    create: vi.fn(),
    findById: vi.fn(),
    findByMatchId: vi.fn(),
    findUpcoming: vi.fn(),
    updateStatus: vi.fn(),
    delete: vi.fn(),
    countCompletedForDog: vi.fn().mockResolvedValue(0),
    getAverageRatingForDog: vi.fn().mockResolvedValue({ average: 0, count: 0 }),
    ...overrides,
  };
}

export function buildFeedbackRepo(overrides: Partial<FeedbackRepository> = {}): FeedbackRepository {
  return {
    create: vi.fn().mockResolvedValue(buildFeedback()),
    findByWalk: vi.fn().mockResolvedValue([]),
    findByDog: vi.fn().mockResolvedValue([]),
    getAverageRating: vi.fn().mockResolvedValue({ average: null, count: 0 }),
    hasSubmitted: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

export function buildGamificationRepo(
  overrides: Partial<GamificationRepository> = {},
): GamificationRepository {
  return {
    createXpTransaction: vi.fn(),
    getTotalXp: vi.fn().mockResolvedValue(0),
    getLeaderboard: vi.fn().mockResolvedValue([]),
    findActiveChallenges: vi.fn().mockResolvedValue([]),
    findUserChallenges: vi.fn().mockResolvedValue([]),
    upsertUserChallenge: vi.fn(),
    findActiveChallengesByType: vi.fn().mockResolvedValue([]),
    findAchievementsByUser: vi.fn().mockResolvedValue([]),
    hasAchievement: vi.fn().mockResolvedValue(false),
    unlockAchievement: vi
      .fn()
      .mockImplementation((_userId: string, type: AchievementType) =>
        Promise.resolve(buildAchievement({ type })),
      ),
    countCompletedWalks: vi.fn().mockResolvedValue(0),
    countMatches: vi.fn().mockResolvedValue(0),
    countGroupEventsJoined: vi.fn().mockResolvedValue(0),
    getTotalWalkDistanceKm: vi.fn().mockResolvedValue(0),
    ...overrides,
  };
}

export function buildBadgeRepo(overrides: Partial<BadgeRepository> = {}): BadgeRepository {
  return {
    findByDog: vi.fn().mockResolvedValue([]),
    award: vi
      .fn()
      .mockImplementation((_dogId: string, type: BadgeType) =>
        Promise.resolve(buildBadge({ type })),
      ),
    hasBadge: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

export function buildGroupEventRepo(
  overrides: Partial<GroupEventRepository> = {},
): GroupEventRepository {
  return {
    create: vi.fn().mockResolvedValue(buildGroupEvent()),
    findById: vi.fn(),
    findByIdWithParticipants: vi.fn(),
    findNearby: vi.fn(),
    findByCreator: vi.fn(),
    findByParticipant: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    addParticipant: vi.fn().mockResolvedValue({
      id: 'p-1',
      eventId: 'event-1',
      userId: 'user-1',
      dogId: 'dog-1',
      status: 'accepted',
      isOrganizer: true,
      joinedAt: new Date(),
    }),
    findParticipant: vi.fn(),
    removeParticipant: vi.fn(),
    updateParticipantStatus: vi.fn(),
    countParticipants: vi.fn(),
    promoteFromWaitlist: vi.fn(),
    findScheduledPastStart: vi.fn().mockResolvedValue([]),
    findInProgressPastEnd: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function buildMessageRepo(overrides: Partial<MessageRepository> = {}): MessageRepository {
  return {
    getConversationsForUser: vi.fn(),
    findByMatch: vi.fn(),
    create: vi.fn(),
    markAsRead: vi.fn(),
    isMatchParticipant: vi.fn().mockResolvedValue(true),
    getOtherParticipant: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

export function buildGroupMessageRepo(
  overrides: Partial<GroupMessageRepository> = {},
): GroupMessageRepository {
  return {
    create: vi.fn(),
    findByEvent: vi.fn().mockResolvedValue({
      messages: [],
      nextCursor: null,
      hasMore: false,
    }),
    getConversationsForUser: vi.fn(),
    markAsRead: vi.fn(),
    isEventParticipant: vi.fn().mockResolvedValue(true),
    getParticipantUserIds: vi.fn(),
    ...overrides,
  };
}

// ── Service builders ─────────────────────────────────────────────────────────

export function buildNotificationService(
  overrides: Partial<NotificationService> = {},
): NotificationService {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function buildChatService(overrides: Partial<ChatService> = {}): ChatService {
  return {
    joinRoom: vi.fn(),
    sendToRoom: vi.fn(),
    ...overrides,
  };
}

export function buildStorageService(overrides: Partial<StorageService> = {}): StorageService {
  return {
    generatePresignedUploadUrl: vi.fn(),
    generateAvatarUploadUrl: vi.fn(),
    buildDogPhotoKey: vi.fn(),
    buildPostMediaKey: vi.fn(),
    buildStoryMediaKey: vi.fn(),
    deleteObject: vi.fn().mockResolvedValue(undefined),
    getPublicUrl: vi.fn().mockReturnValue('https://cdn.example.com/photo.jpg'),
    extractKeyFromUrl: vi.fn().mockReturnValue('photos/photo.jpg'),
    ...overrides,
  };
}

export function buildAuthService(overrides: Partial<AuthService> = {}): AuthService {
  return {
    hashPassword: vi.fn().mockResolvedValue('hashed'),
    verifyPassword: vi.fn().mockResolvedValue(true),
    generateTokenPair: vi
      .fn()
      .mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' }),
    verifyRefreshToken: vi.fn().mockResolvedValue({ sub: 'user-1' }),
    hashToken: vi.fn().mockResolvedValue('hashed-token'),
    hashRefreshToken: vi.fn().mockResolvedValue('hashed-refresh'),
    ...overrides,
  };
}

export function buildExperimentService(
  overrides: Partial<ExperimentService> = {},
): ExperimentService {
  return {
    initialize: vi.fn().mockResolvedValue(undefined),
    shutdown: vi.fn().mockResolvedValue(undefined),
    checkGate: vi.fn().mockReturnValue(false),
    getExperiment: vi.fn().mockReturnValue({ value: false, groupName: null }),
    getConfigValue: vi.fn().mockImplementation((_u, _c, _p, fallback) => fallback),
    logEvent: vi.fn(),
    ...overrides,
  };
}

export function buildEmailService(overrides: Partial<EmailService> = {}): EmailService {
  return {
    sendVerificationOtp: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetOtp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

export function buildTokenRepo(overrides: Partial<TokenRepository> = {}): TokenRepository {
  return {
    createRefreshToken: vi.fn().mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date('2027-01-01'),
      revoked: false,
      createdAt: new Date(),
    }),
    findRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeRefreshTokenByHash: vi.fn(),
    revokeAllUserRefreshTokens: vi.fn(),
    createVerificationToken: vi.fn().mockResolvedValue({
      id: 'vt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      type: 'email_verification',
      expiresAt: new Date('2027-01-01'),
      usedAt: null,
      createdAt: new Date(),
    }),
    findValidVerificationTokenByUser: vi.fn(),
    revokeAllVerificationTokens: vi.fn(),
    markVerificationTokenUsed: vi.fn(),
    ...overrides,
  };
}

// ── Feed entity builders ────────────────────────────────────────────────────

export function buildPost(overrides: Partial<Post> = {}): Post {
  return {
    id: 'post-1',
    authorId: 'user-1',
    caption: 'Una bella giornata al parco',
    latitude: 41.9028,
    longitude: 12.4964,
    walkId: null,
    likesCount: 0,
    commentsCount: 0,
    moderationStatus: 'approved',
    isDeleted: false,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildPostMedia(overrides: Partial<PostMedia> = {}): PostMedia {
  return {
    id: 'media-1',
    postId: 'post-1',
    url: 'https://cdn.example.com/posts/post-1/photo.jpg',
    mediaType: 'photo',
    thumbnailUrl: null,
    position: 0,
    moderationStatus: 'approved',
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildComment(overrides: Partial<PostComment> = {}): PostComment {
  return {
    id: 'comment-1',
    postId: 'post-1',
    authorId: 'user-1',
    parentId: null,
    content: 'Che bello!',
    isDeleted: false,
    createdAt: new Date('2026-03-01'),
    updatedAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildStory(overrides: Partial<Story> = {}): Story {
  return {
    id: 'story-1',
    authorId: 'user-1',
    mediaUrl: 'https://cdn.example.com/stories/user-1/photo.jpg',
    mediaType: 'photo',
    thumbnailUrl: null,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    viewCount: 0,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildContentReport(overrides: Partial<ContentReport> = {}): ContentReport {
  return {
    id: 'report-1',
    reporterId: 'user-1',
    contentType: 'post',
    contentId: 'post-1',
    reason: 'inappropriate',
    description: null,
    status: 'pending',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

export function buildWalkAlbum(overrides: Partial<WalkAlbum> = {}): WalkAlbum {
  return {
    id: 'album-1',
    walkId: 'walk-1',
    title: 'Passeggiata al parco',
    isFinalized: false,
    createdAt: new Date('2026-03-01'),
    ...overrides,
  };
}

// ── Feed repository builders ────────────────────────────────────────────────

export function buildFeedRepo(overrides: Partial<FeedRepository> = {}): FeedRepository {
  return {
    createPost: vi.fn().mockResolvedValue(buildPost()),
    findPostById: vi.fn().mockResolvedValue(buildPost()),
    findPostWithAuthor: vi.fn().mockResolvedValue(null),
    softDeletePost: vi.fn().mockResolvedValue(undefined),
    getFeedForUser: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    getUserPosts: vi.fn().mockResolvedValue({ items: [], nextCursor: null }),
    addMedia: vi.fn().mockResolvedValue(buildPostMedia()),
    findMediaByPost: vi.fn().mockResolvedValue([]),
    countMediaByPost: vi.fn().mockResolvedValue(0),
    updateMediaModerationStatus: vi.fn().mockResolvedValue(undefined),
    addLike: vi.fn().mockResolvedValue({
      id: 'like-1',
      postId: 'post-1',
      userId: 'user-1',
      createdAt: new Date(),
    }),
    removeLike: vi.fn().mockResolvedValue(undefined),
    hasLiked: vi.fn().mockResolvedValue(false),
    addComment: vi.fn().mockResolvedValue(buildComment()),
    findCommentById: vi.fn().mockResolvedValue(null),
    softDeleteComment: vi.fn().mockResolvedValue(undefined),
    getComments: vi.fn().mockResolvedValue({ comments: [], nextCursor: null }),
    ...overrides,
  };
}

export function buildStoryRepo(overrides: Partial<StoryRepository> = {}): StoryRepository {
  return {
    createStory: vi.fn().mockResolvedValue(buildStory()),
    findById: vi.fn().mockResolvedValue(null),
    findActiveStoriesForFeed: vi.fn().mockResolvedValue([]),
    countTodayByAuthor: vi.fn().mockResolvedValue(0),
    addView: vi.fn().mockResolvedValue(null),
    incrementViewCount: vi.fn().mockResolvedValue(undefined),
    deleteExpiredStories: vi.fn().mockResolvedValue({ deletedCount: 0, mediaUrls: [] }),
    ...overrides,
  };
}

export function buildContentReportRepo(
  overrides: Partial<ContentReportRepository> = {},
): ContentReportRepository {
  return {
    createReport: vi.fn().mockResolvedValue(buildContentReport()),
    findPendingReports: vi.fn().mockResolvedValue({ reports: [], nextCursor: null }),
    reviewReport: vi.fn().mockResolvedValue(null),
    hasReported: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

export function buildWalkAlbumRepo(
  overrides: Partial<WalkAlbumRepository> = {},
): WalkAlbumRepository {
  return {
    createAlbum: vi.fn().mockResolvedValue(buildWalkAlbum()),
    findByWalkId: vi.fn().mockResolvedValue(null),
    finalizeAlbum: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ── Fitness entity builders ──────────────────────────────────────────────────

export function buildWalkTrack(overrides: Partial<WalkTrack> = {}): WalkTrack {
  return {
    id: 'track-1',
    walkId: null,
    userId: 'user-1',
    startedAt: new Date('2026-03-10T08:00:00Z'),
    endedAt: null,
    distanceKm: 0,
    durationMinutes: 0,
    avgSpeedKmh: 0,
    isCompleted: false,
    createdAt: new Date('2026-03-10T08:00:00Z'),
    ...overrides,
  };
}

export function buildTrackPoint(overrides: Partial<WalkTrackPoint> = {}): WalkTrackPoint {
  return {
    id: 'point-1',
    trackId: 'track-1',
    latitude: 41.9028,
    longitude: 12.4964,
    altitude: null,
    timestamp: new Date('2026-03-10T08:00:00Z'),
    speedKmh: null,
    position: 0,
    ...overrides,
  };
}

export function buildDailyActivity(overrides: Partial<DailyActivity> = {}): DailyActivity {
  return {
    id: 'activity-1',
    userId: 'user-1',
    date: '2026-03-10',
    stepsCount: 5000,
    walkDistanceKm: 3.5,
    walkDurationMin: 45,
    walkCount: 2,
    source: 'app',
    createdAt: new Date('2026-03-10'),
    updatedAt: new Date('2026-03-10'),
    ...overrides,
  };
}

// ── Fitness repository builders ──────────────────────────────────────────────

export function buildWalkTrackRepo(
  overrides: Partial<WalkTrackRepository> = {},
): WalkTrackRepository {
  return {
    startTrack: vi.fn().mockResolvedValue(buildWalkTrack()),
    addPoints: vi.fn().mockResolvedValue(undefined),
    endTrack: vi.fn().mockResolvedValue(buildWalkTrack({ isCompleted: true })),
    findById: vi.fn().mockResolvedValue(buildWalkTrack()),
    findByWalk: vi.fn().mockResolvedValue(null),
    findByUser: vi.fn().mockResolvedValue({ tracks: [], nextCursor: null }),
    findPointsByTrack: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function buildMatchingAiRepo(
  overrides: Partial<MatchingAiRepository> = {},
): MatchingAiRepository {
  return {
    createSwipeScoreLog: vi.fn().mockResolvedValue({
      id: 'log-1',
      swiperDogId: 'dog-1',
      swipedDogId: 'dog-2',
      direction: 'like',
      sizeScore: 0.7,
      energyScore: 0.8,
      behaviorScore: 0.9,
      walkScore: 0.6,
      distanceScore: 0.5,
      leashScore: 0.7,
      overallScore: 0.72,
      createdAt: new Date(),
    }),
    findSwipeScoreLogsByDog: vi.fn().mockResolvedValue([]),
    findUserPreferences: vi.fn().mockResolvedValue(null),
    upsertUserPreferences: vi
      .fn()
      .mockImplementation((input) =>
        Promise.resolve({ id: 'pref-1', updatedAt: new Date(), ...input }),
      ),
    createMatchInteraction: vi.fn().mockResolvedValue({
      id: 'interaction-1',
      matchId: 'match-1',
      userId: 'user-1',
      interactionType: 'walk_completed',
      metadata: null,
      createdAt: new Date(),
    }),
    findInteractionsByMatches: vi.fn().mockResolvedValue([]),
    upsertActivityWindow: vi.fn().mockResolvedValue({
      id: 'window-1',
      userId: 'user-1',
      dayOfWeek: 1,
      hourOfDay: 9,
      activityCount: 1,
      updatedAt: new Date(),
    }),
    findActivityWindowsByUser: vi.fn().mockResolvedValue([]),
    findNearbyActivityWindows: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}

export function buildActivityRepo(overrides: Partial<ActivityRepository> = {}): ActivityRepository {
  return {
    upsertDaily: vi.fn().mockResolvedValue(buildDailyActivity()),
    getWeeklySummary: vi.fn().mockResolvedValue({
      totalSteps: 0,
      totalDistanceKm: 0,
      totalDurationMin: 0,
      totalWalks: 0,
      avgDailySteps: 0,
      avgDailyDistanceKm: 0,
      avgDailyDurationMin: 0,
      days: [],
    }),
    getMonthlySummary: vi.fn().mockResolvedValue({
      totalSteps: 0,
      totalDistanceKm: 0,
      totalDurationMin: 0,
      totalWalks: 0,
      avgDailySteps: 0,
      avgDailyDistanceKm: 0,
      avgDailyDurationMin: 0,
      days: [],
    }),
    getDailyHistory: vi.fn().mockResolvedValue([]),
    ...overrides,
  };
}
