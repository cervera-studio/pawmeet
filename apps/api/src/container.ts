// Infra implementations
import { DrizzleBreedRepository } from './infra/drizzle-breed-repository.js';
import { DrizzleDogRepository } from './infra/drizzle-dog-repository.js';
import { DrizzleMatchRepository } from './infra/drizzle-match-repository.js';
import { DrizzleMessageRepository } from './infra/drizzle-message-repository.js';
import { DrizzleTokenRepository } from './infra/drizzle-token-repository.js';
import { DrizzleUserRepository } from './infra/drizzle-user-repository.js';
import { JwtAuthService } from './infra/jwt-auth-service.js';
import { R2StorageService } from './infra/r2-storage-service.js';
import { ResendEmailService } from './infra/resend-email-service.js';
import { WsChatService } from './infra/ws-chat-service.js';
import { db } from './lib/db.js';
// Use cases — users
import { createConfirmAvatar } from './use-cases/confirm-avatar.js';
// Use cases — dogs
import { createConfirmDogPhoto } from './use-cases/confirm-dog-photo.js';
import { createCreateDog } from './use-cases/create-dog.js';
import { createDeleteAvatar } from './use-cases/delete-avatar.js';
import { createDeleteDog } from './use-cases/delete-dog.js';
import { createDeleteDogPhoto } from './use-cases/delete-dog-photo.js';
// Use cases — matches
import { createDiscoverCandidates } from './use-cases/discover-candidates.js';
import { createFindNearby } from './use-cases/find-nearby.js';
// Use cases — auth
import { createForgotPassword } from './use-cases/forgot-password.js';
import { createGetDog } from './use-cases/get-dog.js';
// Use cases — chat
import { createGetMessages } from './use-cases/get-messages.js';
import { createGetProfile } from './use-cases/get-profile.js';
import { createLikeDog } from './use-cases/like-dog.js';
import { createListConversations } from './use-cases/list-conversations.js';
import { createListMatches } from './use-cases/list-matches.js';
import { createListUserDogs } from './use-cases/list-user-dogs.js';
import { createLoginUser } from './use-cases/login-user.js';
import { createLogoutUser } from './use-cases/logout-user.js';
import { createMarkMessagesRead } from './use-cases/mark-messages-read.js';
import { createPassDog } from './use-cases/pass-dog.js';
import { createRefreshTokens } from './use-cases/refresh-tokens.js';
import { createRegisterPushToken } from './use-cases/register-push-token.js';
import { createRegisterUser } from './use-cases/register-user.js';
import { createReorderDogPhotos } from './use-cases/reorder-dog-photos.js';
import { createResetPassword } from './use-cases/reset-password.js';
import { createSearchBreeds } from './use-cases/search-breeds.js';
import { createSendMessage } from './use-cases/send-message.js';
import { createUnmatch } from './use-cases/unmatch.js';
import { createUpdateDog } from './use-cases/update-dog.js';
import { createUpdateLocation } from './use-cases/update-location.js';
import { createUpdatePreferences } from './use-cases/update-preferences.js';
import { createUploadAvatarUrl } from './use-cases/upload-avatar-url.js';
import { createUploadDogPhotoUrl } from './use-cases/upload-dog-photo-url.js';
import { createVerifyEmail } from './use-cases/verify-email.js';

// ── Repositories ────────────────────────────────────────────────────────────────

const userRepo = new DrizzleUserRepository(db);
const dogRepo = new DrizzleDogRepository(db);
const matchRepo = new DrizzleMatchRepository(db);
const messageRepo = new DrizzleMessageRepository(db);
const tokenRepo = new DrizzleTokenRepository(db);
const breedRepo = new DrizzleBreedRepository(db);

// ── Services ────────────────────────────────────────────────────────────────────

const authService = new JwtAuthService();
const emailService = new ResendEmailService();
const storage = new R2StorageService();
const chat = new WsChatService();

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
};

// ── Match deps ──────────────────────────────────────────────────────────────────

export const matchDeps = {
  listMatches: createListMatches({ dogRepo, matchRepo, userRepo }),
  discoverCandidates: createDiscoverCandidates({ dogRepo, matchRepo, userRepo }),
  likeDog: createLikeDog({ dogRepo, matchRepo }),
  passDog: createPassDog({ dogRepo, matchRepo }),
  unmatch: createUnmatch({ dogRepo, matchRepo }),
};

// ── Chat deps ───────────────────────────────────────────────────────────────────

export const chatDeps = {
  listConversations: createListConversations({ dogRepo, messageRepo, chat }),
  getMessages: createGetMessages({ messageRepo, chat }),
  sendMessage: createSendMessage({ messageRepo, chat, userRepo }),
  markMessagesRead: createMarkMessagesRead({ messageRepo, chat }),
};
