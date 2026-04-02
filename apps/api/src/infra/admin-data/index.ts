import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { AdminDataRepository } from '../../ports/admin-data-repository.js';
import { DrizzleAdminAuditLogRepository } from './drizzle-admin-audit-log-repository.js';
import { DrizzleAdminBreedRepository } from './drizzle-admin-breed-repository.js';
import { DrizzleAdminDashboardRepository } from './drizzle-admin-dashboard-repository.js';
import { DrizzleAdminDogRepository } from './drizzle-admin-dog-repository.js';
import { DrizzleAdminGroupEventRepository } from './drizzle-admin-group-event-repository.js';
import { DrizzleAdminModerationRepository } from './drizzle-admin-moderation-repository.js';
import { DrizzleAdminNotificationRepository } from './drizzle-admin-notification-repository.js';
import { DrizzleAdminOrganizationRepository } from './drizzle-admin-organization-repository.js';
import { DrizzleAdminSafetyRepository } from './drizzle-admin-safety-repository.js';
import { DrizzleAdminSettingsRepository } from './drizzle-admin-settings-repository.js';
import { DrizzleAdminUserDataRepository } from './drizzle-admin-user-data-repository.js';

export class DrizzleAdminDataRepository implements AdminDataRepository {
  private readonly dashboard: DrizzleAdminDashboardRepository;
  private readonly auditLog: DrizzleAdminAuditLogRepository;
  private readonly userData: DrizzleAdminUserDataRepository;
  private readonly dog: DrizzleAdminDogRepository;
  private readonly moderation: DrizzleAdminModerationRepository;
  private readonly organization: DrizzleAdminOrganizationRepository;
  private readonly groupEvent: DrizzleAdminGroupEventRepository;
  private readonly breed: DrizzleAdminBreedRepository;
  private readonly settings: DrizzleAdminSettingsRepository;
  private readonly safety: DrizzleAdminSafetyRepository;
  private readonly notification: DrizzleAdminNotificationRepository;

  constructor(db: NodePgDatabase) {
    this.dashboard = new DrizzleAdminDashboardRepository(db);
    this.auditLog = new DrizzleAdminAuditLogRepository(db);
    this.userData = new DrizzleAdminUserDataRepository(db);
    this.dog = new DrizzleAdminDogRepository(db);
    this.moderation = new DrizzleAdminModerationRepository(db);
    this.organization = new DrizzleAdminOrganizationRepository(db);
    this.groupEvent = new DrizzleAdminGroupEventRepository(db);
    this.breed = new DrizzleAdminBreedRepository(db);
    this.settings = new DrizzleAdminSettingsRepository(db);
    this.safety = new DrizzleAdminSafetyRepository(db);
    this.notification = new DrizzleAdminNotificationRepository(db);
  }

  // Dashboard
  getStats = (...a: Parameters<AdminDataRepository['getStats']>) => this.dashboard.getStats(...a);
  getTodayDomainMetrics = (...a: Parameters<AdminDataRepository['getTodayDomainMetrics']>) =>
    this.dashboard.getTodayDomainMetrics(...a);

  // Audit log
  listAuditLog = (...a: Parameters<AdminDataRepository['listAuditLog']>) =>
    this.auditLog.listAuditLog(...a);

  // Users
  listUsers = (...a: Parameters<AdminDataRepository['listUsers']>) => this.userData.listUsers(...a);
  getUser = (...a: Parameters<AdminDataRepository['getUser']>) => this.userData.getUser(...a);
  findUserById = (...a: Parameters<AdminDataRepository['findUserById']>) =>
    this.userData.findUserById(...a);
  setUserActive = (...a: Parameters<AdminDataRepository['setUserActive']>) =>
    this.userData.setUserActive(...a);
  cancelDeletion = (...a: Parameters<AdminDataRepository['cancelDeletion']>) =>
    this.userData.cancelDeletion(...a);
  listPendingDeletions = (...a: Parameters<AdminDataRepository['listPendingDeletions']>) =>
    this.userData.listPendingDeletions(...a);
  deactivateUser = (...a: Parameters<AdminDataRepository['deactivateUser']>) =>
    this.userData.deactivateUser(...a);
  getUserConsents = (...a: Parameters<AdminDataRepository['getUserConsents']>) =>
    this.userData.getUserConsents(...a);

  // Dogs
  listDogs = (...a: Parameters<AdminDataRepository['listDogs']>) => this.dog.listDogs(...a);
  getDog = (...a: Parameters<AdminDataRepository['getDog']>) => this.dog.getDog(...a);

  // Moderation (reports, feed, stories, photos)
  listReports = (...a: Parameters<AdminDataRepository['listReports']>) =>
    this.moderation.listReports(...a);
  getReportUserInfos = (...a: Parameters<AdminDataRepository['getReportUserInfos']>) =>
    this.moderation.getReportUserInfos(...a);
  findReportById = (...a: Parameters<AdminDataRepository['findReportById']>) =>
    this.moderation.findReportById(...a);
  resolveReport = (...a: Parameters<AdminDataRepository['resolveReport']>) =>
    this.moderation.resolveReport(...a);
  listFeedPosts = (...a: Parameters<AdminDataRepository['listFeedPosts']>) =>
    this.moderation.listFeedPosts(...a);
  findPostById = (...a: Parameters<AdminDataRepository['findPostById']>) =>
    this.moderation.findPostById(...a);
  updatePostModeration = (...a: Parameters<AdminDataRepository['updatePostModeration']>) =>
    this.moderation.updatePostModeration(...a);
  softDeletePost = (...a: Parameters<AdminDataRepository['softDeletePost']>) =>
    this.moderation.softDeletePost(...a);
  listStories = (...a: Parameters<AdminDataRepository['listStories']>) =>
    this.moderation.listStories(...a);
  findStoryById = (...a: Parameters<AdminDataRepository['findStoryById']>) =>
    this.moderation.findStoryById(...a);
  deleteStory = (...a: Parameters<AdminDataRepository['deleteStory']>) =>
    this.moderation.deleteStory(...a);
  getFeedStats = (...a: Parameters<AdminDataRepository['getFeedStats']>) =>
    this.moderation.getFeedStats(...a);
  listPendingPhotos = (...a: Parameters<AdminDataRepository['listPendingPhotos']>) =>
    this.moderation.listPendingPhotos(...a);
  findPhotoById = (...a: Parameters<AdminDataRepository['findPhotoById']>) =>
    this.moderation.findPhotoById(...a);
  updatePhotoModeration = (...a: Parameters<AdminDataRepository['updatePhotoModeration']>) =>
    this.moderation.updatePhotoModeration(...a);
  approveAllPendingPhotos = (...a: Parameters<AdminDataRepository['approveAllPendingPhotos']>) =>
    this.moderation.approveAllPendingPhotos(...a);

  // Organizations
  listOrganizations = (...a: Parameters<AdminDataRepository['listOrganizations']>) =>
    this.organization.listOrganizations(...a);
  getOrganization = (...a: Parameters<AdminDataRepository['getOrganization']>) =>
    this.organization.getOrganization(...a);
  findOrganizationById = (...a: Parameters<AdminDataRepository['findOrganizationById']>) =>
    this.organization.findOrganizationById(...a);
  verifyOrganization = (...a: Parameters<AdminDataRepository['verifyOrganization']>) =>
    this.organization.verifyOrganization(...a);
  revokeOrganization = (...a: Parameters<AdminDataRepository['revokeOrganization']>) =>
    this.organization.revokeOrganization(...a);

  // Group events & sponsors
  listGroupEvents = (...a: Parameters<AdminDataRepository['listGroupEvents']>) =>
    this.groupEvent.listGroupEvents(...a);
  getGroupEvent = (...a: Parameters<AdminDataRepository['getGroupEvent']>) =>
    this.groupEvent.getGroupEvent(...a);
  findGroupEventById = (...a: Parameters<AdminDataRepository['findGroupEventById']>) =>
    this.groupEvent.findGroupEventById(...a);
  cancelGroupEvent = (...a: Parameters<AdminDataRepository['cancelGroupEvent']>) =>
    this.groupEvent.cancelGroupEvent(...a);
  findParticipantById = (...a: Parameters<AdminDataRepository['findParticipantById']>) =>
    this.groupEvent.findParticipantById(...a);
  removeParticipant = (...a: Parameters<AdminDataRepository['removeParticipant']>) =>
    this.groupEvent.removeParticipant(...a);
  createOfficialEvent = (...a: Parameters<AdminDataRepository['createOfficialEvent']>) =>
    this.groupEvent.createOfficialEvent(...a);
  listEventSponsors = (...a: Parameters<AdminDataRepository['listEventSponsors']>) =>
    this.groupEvent.listEventSponsors(...a);
  findEventSponsor = (...a: Parameters<AdminDataRepository['findEventSponsor']>) =>
    this.groupEvent.findEventSponsor(...a);
  countEventSponsorsByTier = (...a: Parameters<AdminDataRepository['countEventSponsorsByTier']>) =>
    this.groupEvent.countEventSponsorsByTier(...a);
  addEventSponsor = (...a: Parameters<AdminDataRepository['addEventSponsor']>) =>
    this.groupEvent.addEventSponsor(...a);
  removeEventSponsor = (...a: Parameters<AdminDataRepository['removeEventSponsor']>) =>
    this.groupEvent.removeEventSponsor(...a);

  // Breeds
  listBreeds = (...a: Parameters<AdminDataRepository['listBreeds']>) => this.breed.listBreeds(...a);
  findBreedById = (...a: Parameters<AdminDataRepository['findBreedById']>) =>
    this.breed.findBreedById(...a);
  createBreed = (...a: Parameters<AdminDataRepository['createBreed']>) =>
    this.breed.createBreed(...a);
  updateBreed = (...a: Parameters<AdminDataRepository['updateBreed']>) =>
    this.breed.updateBreed(...a);
  deleteBreed = (...a: Parameters<AdminDataRepository['deleteBreed']>) =>
    this.breed.deleteBreed(...a);
  countDogsReferencingBreed = (
    ...a: Parameters<AdminDataRepository['countDogsReferencingBreed']>
  ) => this.breed.countDogsReferencingBreed(...a);

  // Settings (admin users)
  listAdminUsers = (...a: Parameters<AdminDataRepository['listAdminUsers']>) =>
    this.settings.listAdminUsers(...a);
  findAdminUserByEmail = (...a: Parameters<AdminDataRepository['findAdminUserByEmail']>) =>
    this.settings.findAdminUserByEmail(...a);
  createAdminUser = (...a: Parameters<AdminDataRepository['createAdminUser']>) =>
    this.settings.createAdminUser(...a);
  findAdminUserById = (...a: Parameters<AdminDataRepository['findAdminUserById']>) =>
    this.settings.findAdminUserById(...a);
  updateAdminRole = (...a: Parameters<AdminDataRepository['updateAdminRole']>) =>
    this.settings.updateAdminRole(...a);
  toggleAdminActive = (...a: Parameters<AdminDataRepository['toggleAdminActive']>) =>
    this.settings.toggleAdminActive(...a);
  updateAdminPassword = (...a: Parameters<AdminDataRepository['updateAdminPassword']>) =>
    this.settings.updateAdminPassword(...a);

  // Safety
  listSosAlerts = (...a: Parameters<AdminDataRepository['listSosAlerts']>) =>
    this.safety.listSosAlerts(...a);
  listEmergencyContacts = (...a: Parameters<AdminDataRepository['listEmergencyContacts']>) =>
    this.safety.listEmergencyContacts(...a);

  // Notifications
  getActiveUsersWithPushToken = (
    ...a: Parameters<AdminDataRepository['getActiveUsersWithPushToken']>
  ) => this.notification.getActiveUsersWithPushToken(...a);
  getTargetedUsers = (...a: Parameters<AdminDataRepository['getTargetedUsers']>) =>
    this.notification.getTargetedUsers(...a);
  getNotificationStats = (...a: Parameters<AdminDataRepository['getNotificationStats']>) =>
    this.notification.getNotificationStats(...a);
}
