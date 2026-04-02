import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GdprExportRepository } from '../../ports/gdpr-export-repository.js';
import { createActivityQueries } from './activity-queries.js';
import { createComplianceQueries } from './compliance-queries.js';
import { createDogQueries } from './dog-queries.js';
import { createExportStatusQueries } from './export-status.js';
import { createGamificationQueries } from './gamification-queries.js';
import { createMessagingQueries } from './messaging-queries.js';
import { createProfileQueries } from './profile-queries.js';
import { createSocialQueries } from './social-queries.js';

export class DrizzleGdprExportRepository implements GdprExportRepository {
  private readonly profile;
  private readonly dog;
  private readonly social;
  private readonly messaging;
  private readonly activity;
  private readonly gamification;
  private readonly compliance;
  private readonly exportStatus;

  constructor(db: NodePgDatabase) {
    this.profile = createProfileQueries(db);
    this.dog = createDogQueries(db);
    this.social = createSocialQueries(db);
    this.messaging = createMessagingQueries(db);
    this.activity = createActivityQueries(db);
    this.gamification = createGamificationQueries(db);
    this.compliance = createComplianceQueries(db);
    this.exportStatus = createExportStatusQueries(db);
  }

  // -- Profile --
  getProfile = (...a: Parameters<GdprExportRepository['getProfile']>) =>
    this.profile.getProfile(...a);
  getOAuthAccounts = (...a: Parameters<GdprExportRepository['getOAuthAccounts']>) =>
    this.profile.getOAuthAccounts(...a);

  // -- Dogs --
  getDogsWithPhotos = (...a: Parameters<GdprExportRepository['getDogsWithPhotos']>) =>
    this.dog.getDogsWithPhotos(...a);
  getMatches = (...a: Parameters<GdprExportRepository['getMatches']>) => this.dog.getMatches(...a);
  getSwipes = (...a: Parameters<GdprExportRepository['getSwipes']>) => this.dog.getSwipes(...a);
  getSwipeScoreLogs = (...a: Parameters<GdprExportRepository['getSwipeScoreLogs']>) =>
    this.dog.getSwipeScoreLogs(...a);
  getMatchingPreferences = (...a: Parameters<GdprExportRepository['getMatchingPreferences']>) =>
    this.dog.getMatchingPreferences(...a);

  // -- Social --
  getPostsWithMedia = (...a: Parameters<GdprExportRepository['getPostsWithMedia']>) =>
    this.social.getPostsWithMedia(...a);
  getPostLikes = (...a: Parameters<GdprExportRepository['getPostLikes']>) =>
    this.social.getPostLikes(...a);
  getComments = (...a: Parameters<GdprExportRepository['getComments']>) =>
    this.social.getComments(...a);
  getStories = (...a: Parameters<GdprExportRepository['getStories']>) =>
    this.social.getStories(...a);
  getFollowers = (...a: Parameters<GdprExportRepository['getFollowers']>) =>
    this.social.getFollowers(...a);
  getFollowing = (...a: Parameters<GdprExportRepository['getFollowing']>) =>
    this.social.getFollowing(...a);
  getBlocks = (...a: Parameters<GdprExportRepository['getBlocks']>) => this.social.getBlocks(...a);

  // -- Messaging --
  getDmMessages = (...a: Parameters<GdprExportRepository['getDmMessages']>) =>
    this.messaging.getDmMessages(...a);
  getGroupMessages = (...a: Parameters<GdprExportRepository['getGroupMessages']>) =>
    this.messaging.getGroupMessages(...a);
  getNotifications = (...a: Parameters<GdprExportRepository['getNotifications']>) =>
    this.messaging.getNotifications(...a);

  // -- Activity --
  getWalks = (...a: Parameters<GdprExportRepository['getWalks']>) => this.activity.getWalks(...a);
  getWalkTracksWithPoints = (...a: Parameters<GdprExportRepository['getWalkTracksWithPoints']>) =>
    this.activity.getWalkTracksWithPoints(...a);
  getDailyActivity = (...a: Parameters<GdprExportRepository['getDailyActivity']>) =>
    this.activity.getDailyActivity(...a);
  getMoodLogs = (...a: Parameters<GdprExportRepository['getMoodLogs']>) =>
    this.activity.getMoodLogs(...a);
  getSafetyCheckins = (...a: Parameters<GdprExportRepository['getSafetyCheckins']>) =>
    this.activity.getSafetyCheckins(...a);

  // -- Gamification --
  getXpTransactions = (...a: Parameters<GdprExportRepository['getXpTransactions']>) =>
    this.gamification.getXpTransactions(...a);
  getAchievements = (...a: Parameters<GdprExportRepository['getAchievements']>) =>
    this.gamification.getAchievements(...a);
  getChallenges = (...a: Parameters<GdprExportRepository['getChallenges']>) =>
    this.gamification.getChallenges(...a);
  getBadges = (...a: Parameters<GdprExportRepository['getBadges']>) =>
    this.gamification.getBadges(...a);
  getGroupEventParticipation = (
    ...a: Parameters<GdprExportRepository['getGroupEventParticipation']>
  ) => this.gamification.getGroupEventParticipation(...a);

  // -- Compliance --
  getConsents = (...a: Parameters<GdprExportRepository['getConsents']>) =>
    this.compliance.getConsents(...a);
  getContentReports = (...a: Parameters<GdprExportRepository['getContentReports']>) =>
    this.compliance.getContentReports(...a);
  getUserReports = (...a: Parameters<GdprExportRepository['getUserReports']>) =>
    this.compliance.getUserReports(...a);
  getEmergencyContacts = (...a: Parameters<GdprExportRepository['getEmergencyContacts']>) =>
    this.compliance.getEmergencyContacts(...a);
  getFeedbackGiven = (...a: Parameters<GdprExportRepository['getFeedbackGiven']>) =>
    this.compliance.getFeedbackGiven(...a);
  getSupportTickets = (...a: Parameters<GdprExportRepository['getSupportTickets']>) =>
    this.compliance.getSupportTickets(...a);
  getMlTrainingSamples = (...a: Parameters<GdprExportRepository['getMlTrainingSamples']>) =>
    this.compliance.getMlTrainingSamples(...a);

  // -- Export status --
  createExport = (...a: Parameters<GdprExportRepository['createExport']>) =>
    this.exportStatus.createExport(...a);
  findPendingExport = (...a: Parameters<GdprExportRepository['findPendingExport']>) =>
    this.exportStatus.findPendingExport(...a);
  updateExportStatus = (...a: Parameters<GdprExportRepository['updateExportStatus']>) =>
    this.exportStatus.updateExportStatus(...a);
}
