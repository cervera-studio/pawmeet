// -- Profile --

export interface GdprProfile {
  email: string;
  displayName: string;
  authProvider: string;
  avatarUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  locationUpdatedAt: Date | null;
  searchRadiusKm: number;
  emailVerified: boolean;
  notificationPrefs: { matches: boolean; messages: boolean; reminders: boolean } | null;
  dateOfBirth: Date | null;
  pushToken: string | null;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
  lastLoginAt: Date | null;
}

// -- Dogs --

export interface GdprDog {
  id: string;
  name: string;
  birthDate: Date;
  breed: string;
  breedSecondary: string | null;
  size: string;
  weightKg: number;
  gender: string;
  isNeutered: boolean;
  energyLevel: string;
  behaviorWithDogs: string;
  behaviorWithPeople: string;
  leashBehavior: string;
  recallReliability: string | null;
  bio: string | null;
  walkPrefTime: string[];
  walkPrefDurationMin: number;
  walkPrefDurationMax: number;
  walkPrefTerrain: string[];
  createdAt: Date;
  photos: { url: string; position: number; isPrimary: boolean; uploadedAt: Date }[];
}

// -- Posts --

export interface GdprPost {
  caption: string | null;
  latitude: number | null;
  longitude: number | null;
  likesCount: number;
  commentsCount: number;
  createdAt: Date;
  media: { url: string; mediaType: string; position: number }[];
}

// -- Matches --

export interface GdprMatch {
  id: string;
  dogAId: string;
  dogBId: string;
  compatibilityScore: number;
  isActive: boolean;
  createdAt: Date;
}

// -- Swipes --

export interface GdprSwipe {
  swiperDogId: string;
  swipedDogId: string;
  direction: string;
  createdAt: Date;
}

// -- Messages --

export interface GdprDmMessage {
  matchId: string;
  content: string;
  sentByMe: boolean;
  createdAt: Date;
}

export interface GdprGroupMessage {
  eventId: string;
  content: string;
  createdAt: Date;
}

// -- Walks --

export interface GdprWalk {
  title: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  notes: string | null;
  createdAt: Date;
}

export interface GdprWalkTrack {
  startedAt: Date;
  endedAt: Date | null;
  distanceKm: number;
  durationMinutes: number;
  avgSpeedKmh: number;
  points: { latitude: number; longitude: number; altitude: number | null; timestamp: Date }[];
}

// -- Stories --

export interface GdprStory {
  mediaUrl: string;
  mediaType: string;
  viewCount: number;
  createdAt: Date;
}

// -- Social --

export interface GdprFollow {
  userId: string;
  createdAt: Date;
}

export interface GdprBlock {
  blockedUserId: string;
  createdAt: Date;
}

// -- Group events --

export interface GdprGroupEventParticipation {
  eventTitle: string;
  eventScheduledAt: Date;
  eventLocation: string;
  status: string;
  isOrganizer: boolean;
  joinedAt: Date;
}

// -- Gamification --

export interface GdprXpTransaction {
  action: string;
  points: number;
  createdAt: Date;
}

export interface GdprAchievement {
  type: string;
  unlockedAt: Date;
}

export interface GdprChallenge {
  title: string;
  description: string;
  targetValue: number;
  progress: number;
  completedAt: Date | null;
  createdAt: Date;
}

export interface GdprBadge {
  dogId: string;
  type: string;
  awardedAt: Date;
}

// -- Consents --

export interface GdprConsent {
  consentType: string;
  consentVersion: string;
  granted: boolean;
  grantedAt: Date;
  withdrawnAt: Date | null;
  ipAddress: string | null;
  userAgent: string | null;
  source: string;
}

// -- Comments --

export interface GdprComment {
  postId: string;
  content: string;
  createdAt: Date;
}

// -- Feedback --

export interface GdprFeedback {
  walkId: string;
  toDogId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

// -- Post likes --

export interface GdprPostLike {
  postId: string;
  createdAt: Date;
}

// -- Daily activity --

export interface GdprDailyActivity {
  date: string;
  stepsCount: number;
  walkDistanceKm: number;
  walkDurationMin: number;
  walkCount: number;
  source: string;
}

// -- Matching AI --

export interface GdprMatchingPreferences {
  weightSize: number;
  weightEnergy: number;
  weightBehavior: number;
  weightWalk: number;
  weightDistance: number;
  weightLeash: number;
  sampleSize: number;
  successRate: number;
}

export interface GdprSwipeScoreLog {
  swiperDogId: string;
  swipedDogId: string;
  direction: string;
  sizeScore: number;
  energyScore: number;
  behaviorScore: number;
  walkScore: number;
  distanceScore: number;
  leashScore: number;
  overallScore: number;
  createdAt: Date;
}

// -- Content reports --

export interface GdprContentReport {
  contentType: string;
  contentId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
}

export interface GdprUserReport {
  reportedUserId: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: Date;
}

// -- Analytics --

export interface GdprAnalyticsEvent {
  eventName: string;
  properties: Record<string, unknown> | null;
  clientTimestamp: Date;
  serverTimestamp: Date;
  platform: string;
  screenName: string | null;
}

// -- Export status --

export interface GdprExportRecord {
  id: string;
  status: string;
  requestedAt: Date;
  completedAt: Date | null;
}

// -- Repository interface --

export interface GdprExportRepository {
  // Data queries
  getProfile(userId: string): Promise<GdprProfile | null>;
  getDogsWithPhotos(userId: string): Promise<GdprDog[]>;
  getPostsWithMedia(userId: string): Promise<GdprPost[]>;
  getMatches(dogIds: string[]): Promise<GdprMatch[]>;
  getSwipes(dogIds: string[]): Promise<GdprSwipe[]>;
  getDmMessages(userId: string, matchIds: string[]): Promise<GdprDmMessage[]>;
  getGroupMessages(userId: string): Promise<GdprGroupMessage[]>;
  getWalks(matchIds: string[]): Promise<GdprWalk[]>;
  getWalkTracksWithPoints(userId: string): Promise<GdprWalkTrack[]>;
  getStories(userId: string): Promise<GdprStory[]>;
  getFollowers(userId: string): Promise<GdprFollow[]>;
  getFollowing(userId: string): Promise<GdprFollow[]>;
  getBlocks(userId: string): Promise<GdprBlock[]>;
  getGroupEventParticipation(userId: string): Promise<GdprGroupEventParticipation[]>;
  getXpTransactions(userId: string): Promise<GdprXpTransaction[]>;
  getAchievements(userId: string): Promise<GdprAchievement[]>;
  getChallenges(userId: string): Promise<GdprChallenge[]>;
  getBadges(dogIds: string[]): Promise<GdprBadge[]>;
  getConsents(userId: string): Promise<GdprConsent[]>;
  getComments(userId: string): Promise<GdprComment[]>;
  getFeedbackGiven(userId: string): Promise<GdprFeedback[]>;
  getPostLikes(userId: string): Promise<GdprPostLike[]>;
  getDailyActivity(userId: string): Promise<GdprDailyActivity[]>;
  getMatchingPreferences(userId: string): Promise<GdprMatchingPreferences | null>;
  getSwipeScoreLogs(dogIds: string[]): Promise<GdprSwipeScoreLog[]>;
  getContentReports(userId: string): Promise<GdprContentReport[]>;
  getUserReports(userId: string): Promise<GdprUserReport[]>;
  getAnalyticsEvents(userId: string): Promise<GdprAnalyticsEvent[]>;

  // Export status tracking
  createExport(userId: string): Promise<GdprExportRecord>;
  findPendingExport(userId: string): Promise<GdprExportRecord | null>;
  updateExportStatus(
    exportId: string,
    status: string,
    data?: { r2Key?: string; expiresAt?: Date; errorMessage?: string; completedAt?: Date },
  ): Promise<void>;
}
