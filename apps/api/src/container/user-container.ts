// User domain: profile, location, preferences, avatar, account management

import { enqueueGdprExport } from '../jobs/queues/index.js';
import { createCompleteOnboarding } from '../use-cases/complete-onboarding.js';
import { createGetPublicUserProfile } from '../use-cases/get-public-user-profile.js';
import { createConfirmAvatar } from '../use-cases/confirm-avatar.js';
import { createDeleteAccount } from '../use-cases/delete-account.js';
import { createDeleteAvatar } from '../use-cases/delete-avatar.js';
import { createExportUserData } from '../use-cases/export-user-data.js';
import { createFindNearby } from '../use-cases/find-nearby.js';
import { createGetConsents } from '../use-cases/get-consents.js';
import { createGetProfile } from '../use-cases/get-profile.js';
import { createReactivateAccount } from '../use-cases/reactivate-account.js';
import { createRegisterPushToken } from '../use-cases/register-push-token.js';
import { createRequestDataExport } from '../use-cases/request-data-export.js';
import { createSubmitDateOfBirth } from '../use-cases/submit-date-of-birth.js';
import { createUpdateConsents } from '../use-cases/update-consents.js';
import { createUpdateLocation } from '../use-cases/update-location.js';
import { createUpdateNotificationPrefs } from '../use-cases/update-notification-prefs.js';
import { createUpdatePreferences } from '../use-cases/update-preferences.js';
import { createUpdatePrivacyPrefs } from '../use-cases/update-privacy-prefs.js';
import { createUploadAvatarUrl } from '../use-cases/upload-avatar-url.js';
import {
  analyticsProviders,
  appleAuthService,
  authService,
  consentRepo,
  dogRepo,
  emailService,
  feedRepo,
  followRepo,
  gdprExportRepo,
  matchRepo,
  oauthAccountRepo,
  storage,
  storyRepo,
  tokenRepo,
  userRepo,
} from './services.js';

export const userDeps = {
  getProfile: createGetProfile({ userRepo }),
  getPublicUserProfile: createGetPublicUserProfile({ userRepo, dogRepo, followRepo }),
  updateLocation: createUpdateLocation({ userRepo }),
  updatePreferences: createUpdatePreferences({ userRepo }),
  findNearby: createFindNearby({ userRepo, followRepo }),
  uploadAvatarUrl: createUploadAvatarUrl({ storage }),
  confirmAvatar: createConfirmAvatar({ userRepo, storage }),
  deleteAvatar: createDeleteAvatar({ userRepo, storage }),
  registerPushToken: createRegisterPushToken({ userRepo }),
  updateNotificationPrefs: createUpdateNotificationPrefs({ userRepo }),
  updatePrivacyPrefs: createUpdatePrivacyPrefs({ userRepo }),
  deleteAccount: createDeleteAccount({
    userRepo,
    tokenRepo,
    authService,
    storage,
    dogRepo,
    matchRepo,
    feedRepo,
    storyRepo,
    emailService,
    analyticsProviders,
    oauthAccountRepo,
    appleAuthService,
  }),
  exportUserData: createExportUserData({ gdprExportRepo }),
  requestDataExport: createRequestDataExport({
    userRepo,
    gdprExportRepo,
    enqueueExport: enqueueGdprExport,
  }),
  reactivateAccount: createReactivateAccount({ userRepo, authService }),
  submitDateOfBirth: createSubmitDateOfBirth({ userRepo }),
  completeOnboarding: createCompleteOnboarding({ userRepo }),
};

export const consentDeps = {
  updateConsents: createUpdateConsents({ consentRepo }),
  getConsents: createGetConsents({ consentRepo }),
};
