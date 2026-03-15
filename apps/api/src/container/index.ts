// Central re-export — assembles all domain containers into the same public API
// that the old monolithic container.ts provided.

export { adminDeps } from './admin-container.js';
export { authDeps } from './auth-container.js';
export { chatDeps, groupChatDeps } from './chat-container.js';
export { dogDeps } from './dog-container.js';
export { contentModerationDeps, feedDeps } from './feed-container.js';
export { followDeps } from './follow-container.js';
export { badgeDeps, gamificationDeps } from './gamification-container.js';
export { eventSponsorDeps, groupEventDeps } from './group-event-container.js';
export { matchDeps, matchingAiDeps } from './match-container.js';
export { organizationDeps } from './organization-container.js';
export { emergencyContactDeps } from './safety-container.js';
export { analyticsProviders, experimentService } from './services.js';
export { consentDeps, userDeps } from './user-container.js';
export { feedbackDeps, fitnessDeps, walkAlbumDeps, walkDeps } from './walk-container.js';
export {
  analyticsWorkerDeps,
  contentModerationWorkerDeps,
  dataCleanupDeps,
  eventStatusDeps,
  gpsRetentionDeps,
  gdprExportWorkerDeps,
  messageToxicityDeps,
  photoModerationDeps,
  recurringEventDeps,
  storyCleanupWorkerDeps,
} from './worker-container.js';
