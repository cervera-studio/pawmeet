// Infra implementations

import { BullMQNotificationService } from './infra/bullmq-notification-service.js';
import { DrizzleActivityRepository } from './infra/drizzle-activity-repository.js';
import { DrizzleAdminUserRepository } from './infra/drizzle-admin-user-repository.js';
import { DrizzleBadgeRepository } from './infra/drizzle-badge-repository.js';
import { DrizzleBreedRepository } from './infra/drizzle-breed-repository.js';
import { DrizzleContentReportRepository } from './infra/drizzle-content-report-repository.js';
import { DrizzleDogRepository } from './infra/drizzle-dog-repository.js';
import { DrizzleFeedRepository } from './infra/drizzle-feed-repository.js';
import { DrizzleFeedbackRepository } from './infra/drizzle-feedback-repository.js';
import { DrizzleGamificationRepository } from './infra/drizzle-gamification-repository.js';
import { DrizzleGroupEventRepository } from './infra/drizzle-group-event-repository.js';
import { DrizzleGroupMessageRepository } from './infra/drizzle-group-message-repository.js';
import { DrizzleMatchRepository } from './infra/drizzle-match-repository.js';
import { DrizzleMatchingAiRepository } from './infra/drizzle-matching-ai-repository.js';
import { DrizzleMessageRepository } from './infra/drizzle-message-repository.js';
import { DrizzleStoryRepository } from './infra/drizzle-story-repository.js';
import { DrizzleTokenRepository } from './infra/drizzle-token-repository.js';
import { DrizzleUserRepository } from './infra/drizzle-user-repository.js';
import { DrizzleWalkAlbumRepository } from './infra/drizzle-walk-album-repository.js';
import { DrizzleWalkRepository } from './infra/drizzle-walk-repository.js';
import { DrizzleWalkTrackRepository } from './infra/drizzle-walk-track-repository.js';
import { JwksSocialAuthVerifier } from './infra/jwks-social-auth-verifier.js';
import { JwtAuthService } from './infra/jwt-auth-service.js';
import { R2StorageService } from './infra/r2-storage-service.js';
import { ResendEmailService } from './infra/resend-email-service.js';
import { StatsigExperimentService } from './infra/statsig-experiment-service.js';
import { WsChatService } from './infra/ws-chat-service.js';
import { db } from './lib/db.js';
// Use cases — fitness
import { createAddTrackPoints } from './use-cases/add-track-points.js';
// Use cases — gamification
import { createAwardXp } from './use-cases/award-xp.js';
// Use cases — group events
import { createCancelGroupEvent } from './use-cases/cancel-group-event.js';
// Use cases — walks
import { createCancelWalk } from './use-cases/cancel-walk.js';
// Use cases — badges
import { createCheckAndAwardBadges } from './use-cases/check-and-award-badges.js';
import { createCheckAndUnlockAchievements } from './use-cases/check-and-unlock-achievements.js';
// Use cases — users
import { createConfirmAvatar } from './use-cases/confirm-avatar.js';
// Use cases — dogs
import { createConfirmDogPhoto } from './use-cases/confirm-dog-photo.js';
// Use cases — feed
import { createConfirmPostMedia } from './use-cases/confirm-post-media.js';
import { createConfirmStory } from './use-cases/confirm-story.js';
import { createCreateComment } from './use-cases/create-comment.js';
import { createCreateDog } from './use-cases/create-dog.js';
import { createCreateGroupEvent } from './use-cases/create-group-event.js';
import { createCreatePost } from './use-cases/create-post.js';
import { createCreateStory } from './use-cases/create-story.js';
import { createCreateWalkAlbum } from './use-cases/create-walk-album.js';
import { createDeleteAvatar } from './use-cases/delete-avatar.js';
import { createDeleteComment } from './use-cases/delete-comment.js';
import { createDeleteDog } from './use-cases/delete-dog.js';
import { createDeleteDogPhoto } from './use-cases/delete-dog-photo.js';
import { createDeletePost } from './use-cases/delete-post.js';
// Use cases — matches
import { createDiscoverCandidates } from './use-cases/discover-candidates.js';
import { createDiscoverCandidatesAi } from './use-cases/discover-candidates-ai.js';
import { createEndWalkTracking } from './use-cases/end-walk-tracking.js';
import { createFindNearby } from './use-cases/find-nearby.js';
// Use cases — auth
import { createForgotPassword } from './use-cases/forgot-password.js';
import { createGetActivityStats } from './use-cases/get-activity-stats.js';
import { createGetDog } from './use-cases/get-dog.js';
import { createGetDogHealthGoal } from './use-cases/get-dog-health-goal.js';
// Use cases — feedback
import { createGetDogRating } from './use-cases/get-dog-rating.js';
import { createGetFeed } from './use-cases/get-feed.js';
import { createGetFeedStories } from './use-cases/get-feed-stories.js';
import { createGetGroupEvent } from './use-cases/get-group-event.js';
// Use cases — chat
import { createGetGroupMessages } from './use-cases/get-group-messages.js';
import { createGetLeaderboard } from './use-cases/get-leaderboard.js';
import { createGetMatchingInsights } from './use-cases/get-matching-insights.js';
import { createGetMessages } from './use-cases/get-messages.js';
import { createGetOptimalTimes } from './use-cases/get-optimal-times.js';
import { createGetPendingReports } from './use-cases/get-pending-reports.js';
import { createGetPostComments } from './use-cases/get-post-comments.js';
import { createGetPostDetail } from './use-cases/get-post-detail.js';
import { createGetProfile } from './use-cases/get-profile.js';
import { createGetUserPosts } from './use-cases/get-user-posts.js';
import { createGetUserTracks } from './use-cases/get-user-tracks.js';
import { createGetWalkAlbum } from './use-cases/get-walk-album.js';
import { createGetWalkTrack } from './use-cases/get-walk-track.js';
import { createGetXpSummary } from './use-cases/get-xp-summary.js';
import { createJoinGroupEvent } from './use-cases/join-group-event.js';
import { createLearnUserPreferences } from './use-cases/learn-user-preferences.js';
import { createLeaveGroupEvent } from './use-cases/leave-group-event.js';
import { createLikeDog } from './use-cases/like-dog.js';
import { createLikePost } from './use-cases/like-post.js';
import { createListAchievements } from './use-cases/list-achievements.js';
import { createListActiveChallenges } from './use-cases/list-active-challenges.js';
import { createListBadges } from './use-cases/list-badges.js';
import { createListConversations } from './use-cases/list-conversations.js';
import { createListGroupConversations } from './use-cases/list-group-conversations.js';
import { createListMatches } from './use-cases/list-matches.js';
import { createListNearbyEvents } from './use-cases/list-nearby-events.js';
import { createListUpcomingWalks } from './use-cases/list-upcoming-walks.js';
import { createListUserDogs } from './use-cases/list-user-dogs.js';
import { createListUserEvents } from './use-cases/list-user-events.js';
import { createListWalkFeedback } from './use-cases/list-walk-feedback.js';
import { createListWalksByMatch } from './use-cases/list-walks-by-match.js';
import { createLogSwipeScores } from './use-cases/log-swipe-scores.js';
import { createLoginUser } from './use-cases/login-user.js';
import { createLogoutUser } from './use-cases/logout-user.js';
import { createMarkGroupMessagesRead } from './use-cases/mark-group-messages-read.js';
import { createMarkMessagesRead } from './use-cases/mark-messages-read.js';
import { createPassDog } from './use-cases/pass-dog.js';
import { createProposeWalk } from './use-cases/propose-walk.js';
import { createRecordActivityWindow } from './use-cases/record-activity-window.js';
import { createRecordMatchInteraction } from './use-cases/record-match-interaction.js';
import { createRefreshTokens } from './use-cases/refresh-tokens.js';
import { createRegisterPushToken } from './use-cases/register-push-token.js';
import { createRegisterUser } from './use-cases/register-user.js';
import { createReorderDogPhotos } from './use-cases/reorder-dog-photos.js';
import { createReportContent } from './use-cases/report-content.js';
import { createResendVerification } from './use-cases/resend-verification.js';
import { createResetPassword } from './use-cases/reset-password.js';
import { createRespondToWalk } from './use-cases/respond-to-walk.js';
import { createReviewContentReport } from './use-cases/review-content-report.js';
import { createSearchBreeds } from './use-cases/search-breeds.js';
import { createSendGroupMessage } from './use-cases/send-group-message.js';
import { createSendMessage } from './use-cases/send-message.js';
import { createSocialLogin } from './use-cases/social-login.js';
import { createStartWalkTracking } from './use-cases/start-walk-tracking.js';
import { createSubmitFeedback } from './use-cases/submit-feedback.js';
import { createSyncHealthData } from './use-cases/sync-health-data.js';
import { createUnmatch } from './use-cases/unmatch.js';
import { createUpdateChallengeProgress } from './use-cases/update-challenge-progress.js';
import { createUpdateDog } from './use-cases/update-dog.js';
import { createUpdateGroupEvent } from './use-cases/update-group-event.js';
import { createUpdateLocation } from './use-cases/update-location.js';
import { createUpdateNotificationPrefs } from './use-cases/update-notification-prefs.js';
import { createUpdatePreferences } from './use-cases/update-preferences.js';
import { createUploadAvatarUrl } from './use-cases/upload-avatar-url.js';
import { createUploadDogPhotoUrl } from './use-cases/upload-dog-photo-url.js';
import { createUploadPostMediaUrl } from './use-cases/upload-post-media-url.js';
import { createVerifyEmailOtp } from './use-cases/verify-email-otp.js';
import { createViewStory } from './use-cases/view-story.js';

// ── Repositories ────────────────────────────────────────────────────────────────

const adminUserRepo = new DrizzleAdminUserRepository(db);
const userRepo = new DrizzleUserRepository(db);
const dogRepo = new DrizzleDogRepository(db);
const matchRepo = new DrizzleMatchRepository(db);
const messageRepo = new DrizzleMessageRepository(db);
const tokenRepo = new DrizzleTokenRepository(db);
const breedRepo = new DrizzleBreedRepository(db);
const walkRepo = new DrizzleWalkRepository(db);
const feedbackRepo = new DrizzleFeedbackRepository(db);
const groupEventRepo = new DrizzleGroupEventRepository(db);
const groupMessageRepo = new DrizzleGroupMessageRepository(db);
const badgeRepo = new DrizzleBadgeRepository(db);
const gamificationRepo = new DrizzleGamificationRepository(db);
const feedRepo = new DrizzleFeedRepository(db);
const storyRepo = new DrizzleStoryRepository(db);
const contentReportRepo = new DrizzleContentReportRepository(db);
const walkAlbumRepo = new DrizzleWalkAlbumRepository(db);
const walkTrackRepo = new DrizzleWalkTrackRepository(db);
const activityRepo = new DrizzleActivityRepository(db);
const matchingAiRepo = new DrizzleMatchingAiRepository(db);

// ── Services ────────────────────────────────────────────────────────────────────

const authService = new JwtAuthService();
const socialAuthVerifier = new JwksSocialAuthVerifier(
  process.env.APPLE_BUNDLE_ID ?? '',
  process.env.GOOGLE_CLIENT_ID ?? '',
);
const emailService = new ResendEmailService();
const storage = new R2StorageService();
const chat = new WsChatService();
const notificationService = new BullMQNotificationService();
const experimentService = new StatsigExperimentService(process.env.STATSIG_SERVER_SECRET ?? '');

// ── Auth deps ───────────────────────────────────────────────────────────────────

export const authDeps = {
  registerUser: createRegisterUser({ userRepo, tokenRepo, authService, emailService }),
  loginUser: createLoginUser({ userRepo, tokenRepo, authService }),
  refreshTokens: createRefreshTokens({ tokenRepo, authService }),
  logoutUser: createLogoutUser({ tokenRepo, authService }),
  forgotPassword: createForgotPassword({ userRepo, tokenRepo, authService, emailService }),
  resetPassword: createResetPassword({ userRepo, tokenRepo, authService }),
  socialLogin: createSocialLogin({ userRepo, tokenRepo, authService, socialAuthVerifier }),
  verifyEmailOtp: createVerifyEmailOtp({ userRepo, tokenRepo, authService }),
  resendVerification: createResendVerification({ userRepo, tokenRepo, authService, emailService }),
};

// ── Dog deps ────────────────────────────────────────────────────────────────────

export const dogDeps = {
  searchBreeds: createSearchBreeds({ breedRepo }),
  listUserDogs: createListUserDogs({ dogRepo }),
  createDog: createCreateDog({ dogRepo }),
  getDog: createGetDog({ dogRepo }),
  updateDog: createUpdateDog({ dogRepo }),
  deleteDog: createDeleteDog({ dogRepo }),
  uploadDogPhotoUrl: createUploadDogPhotoUrl({ dogRepo, storage }),
  confirmDogPhoto: createConfirmDogPhoto({ dogRepo, storage }),
  deleteDogPhoto: createDeleteDogPhoto({ dogRepo, storage }),
  reorderDogPhotos: createReorderDogPhotos({ dogRepo }),
};

// ── User deps ───────────────────────────────────────────────────────────────────

export const userDeps = {
  getProfile: createGetProfile({ userRepo }),
  updateLocation: createUpdateLocation({ userRepo }),
  updatePreferences: createUpdatePreferences({ userRepo }),
  findNearby: createFindNearby({ userRepo }),
  uploadAvatarUrl: createUploadAvatarUrl({ storage }),
  confirmAvatar: createConfirmAvatar({ userRepo, storage }),
  deleteAvatar: createDeleteAvatar({ userRepo, storage }),
  registerPushToken: createRegisterPushToken({ userRepo }),
  updateNotificationPrefs: createUpdateNotificationPrefs({ userRepo }),
};

// ── Match deps ──────────────────────────────────────────────────────────────────

export const matchDeps = {
  listMatches: createListMatches({ dogRepo, matchRepo, userRepo }),
  discoverCandidates: createDiscoverCandidates({ dogRepo, matchRepo, userRepo }),
  likeDog: createLikeDog({ dogRepo, matchRepo, userRepo, notificationService }),
  passDog: createPassDog({ dogRepo, matchRepo }),
  unmatch: createUnmatch({ dogRepo, matchRepo }),
};

// ── Matching AI deps ───────────────────────────────────────────────────────────

export const matchingAiDeps = {
  logSwipeScores: createLogSwipeScores({ matchingAiRepo }),
  recordMatchInteraction: createRecordMatchInteraction({ matchingAiRepo, matchRepo }),
  recordActivityWindow: createRecordActivityWindow({ matchingAiRepo }),
  learnUserPreferences: createLearnUserPreferences({ matchingAiRepo, matchRepo, dogRepo }),
  getOptimalTimes: createGetOptimalTimes({ matchingAiRepo, dogRepo }),
  getMatchingInsights: createGetMatchingInsights({
    matchingAiRepo,
    matchRepo,
    dogRepo,
    experimentService,
  }),
  discoverCandidatesAi: createDiscoverCandidatesAi({
    dogRepo,
    matchRepo,
    userRepo,
    matchingAiRepo,
    experimentService,
  }),
};

// Export for server startup/shutdown
export { experimentService };

// ── Walk deps ───────────────────────────────────────────────────────────────────

export const walkDeps = {
  proposeWalk: createProposeWalk({ walkRepo, matchRepo, dogRepo }),
  respondToWalk: createRespondToWalk({ walkRepo, matchRepo, dogRepo }),
  cancelWalk: createCancelWalk({ walkRepo, matchRepo, dogRepo }),
  listUpcomingWalks: createListUpcomingWalks({ walkRepo }),
  listWalksByMatch: createListWalksByMatch({ walkRepo, matchRepo, dogRepo }),
};

// ── Feedback deps ──────────────────────────────────────────────────────────────

export const feedbackDeps = {
  submitFeedback: createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo }),
  listWalkFeedback: createListWalkFeedback({ feedbackRepo }),
  getDogRating: createGetDogRating({ feedbackRepo }),
};

// ── Badge deps ─────────────────────────────────────────────────────────────────

export const badgeDeps = {
  listBadges: createListBadges({ badgeRepo }),
  checkAndAwardBadges: createCheckAndAwardBadges({ badgeRepo, walkRepo }),
};

// ── Chat deps ───────────────────────────────────────────────────────────────────

export const chatDeps = {
  listConversations: createListConversations({ dogRepo, messageRepo, chat }),
  getMessages: createGetMessages({ messageRepo, chat }),
  sendMessage: createSendMessage({ messageRepo, chat, userRepo, notificationService }),
  markMessagesRead: createMarkMessagesRead({ messageRepo, chat }),
};

// ── Group chat deps ──────────────────────────────────────────────────────────

export const groupChatDeps = {
  listGroupConversations: createListGroupConversations({ groupMessageRepo, chat }),
  getGroupMessages: createGetGroupMessages({ groupMessageRepo, chat }),
  sendGroupMessage: createSendGroupMessage({
    groupMessageRepo,
    chat,
    userRepo,
    notificationService,
  }),
  markGroupMessagesRead: createMarkGroupMessagesRead({ groupMessageRepo, chat }),
};

// ── Group event deps ──────────────────────────────────────────────────────────

export const groupEventDeps = {
  createGroupEvent: createCreateGroupEvent({ groupEventRepo, dogRepo }),
  getGroupEvent: createGetGroupEvent({ groupEventRepo }),
  listNearbyEvents: createListNearbyEvents({ groupEventRepo }),
  listUserEvents: createListUserEvents({ groupEventRepo }),
  joinGroupEvent: createJoinGroupEvent({ groupEventRepo, dogRepo, notificationService }),
  leaveGroupEvent: createLeaveGroupEvent({ groupEventRepo, notificationService }),
  updateGroupEvent: createUpdateGroupEvent({ groupEventRepo }),
  cancelGroupEvent: createCancelGroupEvent({ groupEventRepo, notificationService }),
};

// ── Gamification deps ────────────────────────────────────────────────────────

const awardXp = createAwardXp({ gamificationRepo });

export const gamificationDeps = {
  awardXp,
  getXpSummary: createGetXpSummary({ gamificationRepo }),
  getLeaderboard: createGetLeaderboard({ gamificationRepo }),
  listActiveChallenges: createListActiveChallenges({ gamificationRepo }),
  updateChallengeProgress: createUpdateChallengeProgress({ gamificationRepo, awardXp }),
  checkAndUnlockAchievements: createCheckAndUnlockAchievements({ gamificationRepo }),
  listAchievements: createListAchievements({ gamificationRepo }),
};

// ── Feed deps ─────────────────────────────────────────────────────────────────

export const feedDeps = {
  createPost: createCreatePost({ feedRepo, awardXp }),
  deletePost: createDeletePost({ feedRepo }),
  getFeed: createGetFeed({ feedRepo }),
  getUserPosts: createGetUserPosts({ feedRepo }),
  getPostDetail: createGetPostDetail({ feedRepo }),
  uploadPostMediaUrl: createUploadPostMediaUrl({ feedRepo, storage }),
  confirmPostMedia: createConfirmPostMedia({ feedRepo, storage }),
  likePost: createLikePost({ feedRepo }),
  createComment: createCreateComment({ feedRepo }),
  deleteComment: createDeleteComment({ feedRepo }),
  getPostComments: createGetPostComments({ feedRepo }),
  createStory: createCreateStory({ storyRepo, storage }),
  confirmStory: createConfirmStory({ storyRepo, storage, awardXp }),
  getFeedStories: createGetFeedStories({ storyRepo }),
  viewStory: createViewStory({ storyRepo }),
  reportContent: createReportContent({ contentReportRepo }),
  getWalkAlbum: createGetWalkAlbum({ walkAlbumRepo, feedRepo }),
};

// ── Fitness deps ────────────────────────────────────────────────────────────

export const fitnessDeps = {
  startWalkTracking: createStartWalkTracking({ walkTrackRepo, walkRepo }),
  addTrackPoints: createAddTrackPoints({ walkTrackRepo }),
  endWalkTracking: createEndWalkTracking({ walkTrackRepo, awardXp }),
  getWalkTrack: createGetWalkTrack({ walkTrackRepo }),
  getUserTracks: createGetUserTracks({ walkTrackRepo }),
  syncHealthData: createSyncHealthData({ activityRepo }),
  getActivityStats: createGetActivityStats({ activityRepo }),
  getDogHealthGoal: createGetDogHealthGoal({ dogRepo, activityRepo }),
};

// ── Content moderation deps ─────────────────────────────────────────────────

export const contentModerationDeps = {
  getPendingReports: createGetPendingReports({ contentReportRepo }),
  reviewContentReport: createReviewContentReport({ contentReportRepo }),
};

// ── Walk album deps ─────────────────────────────────────────────────────────

export const walkAlbumDeps = {
  createWalkAlbum: createCreateWalkAlbum({ walkAlbumRepo }),
};

// ── Admin deps ────────────────────────────────────────────────────────────────

export const adminDeps = {
  adminUserRepo,
};

// ── Event status deps ─────────────────────────────────────────────────────────

export const eventStatusDeps = {
  groupEventRepo,
  notificationService,
};

// ── Photo moderation deps ─────────────────────────────────────────────────────

export const photoModerationDeps = {
  dogRepo,
  notificationService,
};

// ── Content moderation worker deps ──────────────────────────────────────────

export const contentModerationWorkerDeps = {
  feedRepo,
  notificationService,
};

// ── Story cleanup worker deps ───────────────────────────────────────────────

export const storyCleanupWorkerDeps = {
  storyRepo,
  storage,
};
