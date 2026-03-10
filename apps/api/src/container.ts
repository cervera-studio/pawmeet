// Infra implementations

import { BullMQNotificationService } from './infra/bullmq-notification-service.js';
import { DrizzleAdminUserRepository } from './infra/drizzle-admin-user-repository.js';
import { DrizzleBadgeRepository } from './infra/drizzle-badge-repository.js';
import { DrizzleBreedRepository } from './infra/drizzle-breed-repository.js';
import { DrizzleDogRepository } from './infra/drizzle-dog-repository.js';
import { DrizzleFeedbackRepository } from './infra/drizzle-feedback-repository.js';
import { DrizzleGroupEventRepository } from './infra/drizzle-group-event-repository.js';
import { DrizzleMatchRepository } from './infra/drizzle-match-repository.js';
import { DrizzleMessageRepository } from './infra/drizzle-message-repository.js';
import { DrizzleTokenRepository } from './infra/drizzle-token-repository.js';
import { DrizzleUserRepository } from './infra/drizzle-user-repository.js';
import { DrizzleWalkRepository } from './infra/drizzle-walk-repository.js';
import { JwtAuthService } from './infra/jwt-auth-service.js';
import { R2StorageService } from './infra/r2-storage-service.js';
import { ResendEmailService } from './infra/resend-email-service.js';
import { WsChatService } from './infra/ws-chat-service.js';
import { db } from './lib/db.js';
// Use cases — group events
import { createCancelGroupEvent } from './use-cases/cancel-group-event.js';
// Use cases — walks
import { createCancelWalk } from './use-cases/cancel-walk.js';
// Use cases — badges
import { createCheckAndAwardBadges } from './use-cases/check-and-award-badges.js';
// Use cases — users
import { createConfirmAvatar } from './use-cases/confirm-avatar.js';
// Use cases — dogs
import { createConfirmDogPhoto } from './use-cases/confirm-dog-photo.js';
import { createCreateDog } from './use-cases/create-dog.js';
import { createCreateGroupEvent } from './use-cases/create-group-event.js';
import { createDeleteAvatar } from './use-cases/delete-avatar.js';
import { createDeleteDog } from './use-cases/delete-dog.js';
import { createDeleteDogPhoto } from './use-cases/delete-dog-photo.js';
// Use cases — matches
import { createDiscoverCandidates } from './use-cases/discover-candidates.js';
import { createFindNearby } from './use-cases/find-nearby.js';
// Use cases — auth
import { createForgotPassword } from './use-cases/forgot-password.js';
import { createGetDog } from './use-cases/get-dog.js';
// Use cases — feedback
import { createGetDogRating } from './use-cases/get-dog-rating.js';
import { createGetGroupEvent } from './use-cases/get-group-event.js';
// Use cases — chat
import { createGetMessages } from './use-cases/get-messages.js';
import { createGetProfile } from './use-cases/get-profile.js';
import { createJoinGroupEvent } from './use-cases/join-group-event.js';
import { createLeaveGroupEvent } from './use-cases/leave-group-event.js';
import { createLikeDog } from './use-cases/like-dog.js';
import { createListBadges } from './use-cases/list-badges.js';
import { createListConversations } from './use-cases/list-conversations.js';
import { createListMatches } from './use-cases/list-matches.js';
import { createListNearbyEvents } from './use-cases/list-nearby-events.js';
import { createListUpcomingWalks } from './use-cases/list-upcoming-walks.js';
import { createListUserDogs } from './use-cases/list-user-dogs.js';
import { createListUserEvents } from './use-cases/list-user-events.js';
import { createListWalkFeedback } from './use-cases/list-walk-feedback.js';
import { createListWalksByMatch } from './use-cases/list-walks-by-match.js';
import { createLoginUser } from './use-cases/login-user.js';
import { createLogoutUser } from './use-cases/logout-user.js';
import { createMarkMessagesRead } from './use-cases/mark-messages-read.js';
import { createPassDog } from './use-cases/pass-dog.js';
import { createProposeWalk } from './use-cases/propose-walk.js';
import { createRefreshTokens } from './use-cases/refresh-tokens.js';
import { createRegisterPushToken } from './use-cases/register-push-token.js';
import { createRegisterUser } from './use-cases/register-user.js';
import { createReorderDogPhotos } from './use-cases/reorder-dog-photos.js';
import { createResetPassword } from './use-cases/reset-password.js';
import { createRespondToWalk } from './use-cases/respond-to-walk.js';
import { createSearchBreeds } from './use-cases/search-breeds.js';
import { createSendMessage } from './use-cases/send-message.js';
import { createSubmitFeedback } from './use-cases/submit-feedback.js';
import { createUnmatch } from './use-cases/unmatch.js';
import { createUpdateDog } from './use-cases/update-dog.js';
import { createUpdateGroupEvent } from './use-cases/update-group-event.js';
import { createUpdateLocation } from './use-cases/update-location.js';
import { createUpdateNotificationPrefs } from './use-cases/update-notification-prefs.js';
import { createUpdatePreferences } from './use-cases/update-preferences.js';
import { createUploadAvatarUrl } from './use-cases/upload-avatar-url.js';
import { createUploadDogPhotoUrl } from './use-cases/upload-dog-photo-url.js';
import { createVerifyEmail } from './use-cases/verify-email.js';

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
const badgeRepo = new DrizzleBadgeRepository(db);

// ── Services ────────────────────────────────────────────────────────────────────

const authService = new JwtAuthService();
const emailService = new ResendEmailService();
const storage = new R2StorageService();
const chat = new WsChatService();
const notificationService = new BullMQNotificationService();

// ── Auth deps ───────────────────────────────────────────────────────────────────

export const authDeps = {
  registerUser: createRegisterUser({ userRepo, tokenRepo, authService, emailService }),
  loginUser: createLoginUser({ userRepo, tokenRepo, authService }),
  refreshTokens: createRefreshTokens({ tokenRepo, authService }),
  logoutUser: createLogoutUser({ tokenRepo, authService }),
  verifyEmail: createVerifyEmail({ userRepo, tokenRepo, authService }),
  forgotPassword: createForgotPassword({ userRepo, tokenRepo, authService, emailService }),
  resetPassword: createResetPassword({ userRepo, tokenRepo, authService }),
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

// ── Admin deps ────────────────────────────────────────────────────────────────

export const adminDeps = {
  adminUserRepo,
};

// ── Photo moderation deps ─────────────────────────────────────────────────────

export const photoModerationDeps = {
  dogRepo,
  notificationService,
};
