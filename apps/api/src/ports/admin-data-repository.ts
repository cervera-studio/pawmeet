// ── Result types ────────────────────────────────────────────────────────────────

export interface PaginatedResult<T> {
  data: T[];
  total: number;
}

export interface TimeSeriesPoint {
  date: string;
  count: number;
}

export interface DashboardStats {
  totalUsers: number;
  totalDogs: number;
  totalMatches: number;
  activeMatches: number;
  pendingPhotos: number;
  pendingReports: number;
  pendingFeedPosts: number;
  userRegistrations: TimeSeriesPoint[];
  dailyMatches: TimeSeriesPoint[];
}

export interface AnalyticsDbMetrics {
  todayMetrics: { eventName: string; value: number }[];
  totalEvents: number;
  eventsLast24h: number;
}

export interface AuditLogEntry {
  id: string;
  adminId: string;
  adminName: string | null;
  adminEmail: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  changes: Record<string, unknown> | null;
  reason: string | null;
  ipAddress: string | null;
  createdAt: Date;
}

export interface AuditLogFilters {
  page: number;
  pageSize: number;
  adminId?: string;
  resourceType?: string;
  action?: string;
  from?: string;
  to?: string;
  search?: string;
}

export interface AdminDogListItem {
  id: string;
  name: string;
  breed: string | null;
  size: string;
  isActive: boolean;
  createdAt: Date;
  ownerName: string | null;
  ownerId: string | null;
}

export interface AdminDogDetail {
  id: string;
  name: string;
  breed: string | null;
  breedSecondary: string | null;
  size: string;
  weightKg: number | null;
  gender: string | null;
  isNeutered: boolean | null;
  energyLevel: string | null;
  behaviorWithDogs: string | null;
  behaviorWithPeople: string | null;
  leashBehavior: string | null;
  bio: string | null;
  isActive: boolean;
  createdAt: Date;
  ownerName: string | null;
  ownerId: string | null;
  photos: { id: string; url: string; position: number; moderationStatus: string }[];
}

export interface AdminReportItem {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  resolvedAction: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  reporterId: string;
  reportedUserId: string;
}

export interface AdminReportUserInfo {
  id: string;
  displayName: string | null;
  email: string | null;
}

export interface AdminFeedPostItem {
  id: string;
  caption: string | null;
  moderationStatus: string;
  likesCount: number;
  commentsCount: number;
  isDeleted: boolean;
  createdAt: Date;
  authorId: string;
  authorName: string | null;
  authorEmail: string | null;
}

export interface AdminPostMedia {
  id: string;
  postId: string;
  url: string;
  mediaType: string;
  thumbnailUrl: string | null;
}

export interface AdminFeedPostsResult {
  posts: AdminFeedPostItem[];
  total: number;
  media: AdminPostMedia[];
  reportCounts: { contentId: string; count: number }[];
}

export interface AdminStoryItem {
  id: string;
  mediaUrl: string;
  mediaType: string;
  viewCount: number;
  createdAt: Date;
  expiresAt: Date;
  authorId: string;
  authorName: string | null;
}

export interface FeedStats {
  totalPosts: number;
  pendingPosts: number;
  rejectedPosts: number;
  totalStories: number;
  pendingReports: number;
}

export interface AdminGroupEventItem {
  id: string;
  title: string;
  category: string;
  visibility: string;
  status: string;
  scheduledAt: Date;
  location: string | null;
  maxParticipants: number | null;
  requiresApproval: boolean;
  createdAt: Date;
  creatorId: string;
  creatorName: string | null;
  recurrenceRule: string | null;
  parentEventId: string | null;
}

export interface AdminGroupEventParticipantCount {
  eventId: string;
  status: string;
  count: number;
}

export interface AdminGroupEventDetail {
  id: string;
  title: string;
  description: string | null;
  category: string;
  visibility: string;
  status: string;
  scheduledAt: Date;
  durationMin: number | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  maxParticipants: number | null;
  requiresApproval: boolean;
  recurrenceRule: string | null;
  recurrenceEnd: Date | null;
  parentEventId: string | null;
  coverImageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  creatorId: string;
  creatorName: string | null;
}

export interface AdminEventParticipant {
  id: string;
  userId: string;
  userName: string | null;
  dogId: string | null;
  dogName: string | null;
  status: string;
  isOrganizer: boolean;
  joinedAt: Date | null;
}

export interface AdminOrganizationItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  description: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  isVerified: boolean;
  verifiedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
}

export interface AdminOrganizationDetail extends AdminOrganizationItem {
  verifiedBy: string | null;
  updatedAt: Date;
}

export interface AdminOrganizationMember {
  id: string;
  userId: string;
  userName: string | null;
  userEmail: string | null;
  role: string;
  createdAt: Date;
}

export interface AdminUserListItem {
  id: string;
  name: string | null;
  email: string | null;
  isActive: boolean;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
}

export interface AdminUserDetail {
  id: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isActive: boolean;
  authProvider: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  followersCount: number;
  followingCount: number;
}

export interface AdminUserDog {
  id: string;
  name: string;
  breed: string | null;
  isActive: boolean;
}

export interface AdminDeletionItem {
  id: string;
  displayName: string | null;
  email: string | null;
  createdAt: Date;
  deletionScheduledAt: Date | null;
}

export interface AdminSosAlertItem {
  id: string;
  walkId: string;
  userId: string;
  userName: string | null;
  type: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: Date;
  walkTitle: string | null;
  walkStatus: string | null;
  walkScheduledAt: Date | null;
}

export interface AdminEmergencyContactItem {
  id: string;
  userId: string;
  userName: string | null;
  contactName: string;
  phone: string;
  relationship: string | null;
  createdAt: Date;
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface AdminEventSponsorItem {
  id: string;
  eventId: string;
  organizationId: string;
  tier: string;
  logoPlacement: string;
  createdAt: Date;
  organizationName: string;
  organizationLogoUrl: string | null;
}

export interface AdminBreedItem {
  id: number;
  name: string;
  nameIt: string;
  group: string | null;
  sizeCategory: string | null;
  avgWeightKg: number | null;
  energy: number | null;
  playfulness: number | null;
  trainability: number | null;
  barking: number | null;
  goodWithOtherDogs: number | null;
  goodWithChildren: number | null;
  goodWithStrangers: number | null;
  protectiveness: number | null;
  shedding: number | null;
  grooming: number | null;
}

export interface AdminEventSponsorRow {
  id: string;
  eventId: string;
  organizationId: string;
  tier: string;
  logoPlacement: string;
  createdAt: Date;
}

export interface PendingPhotoItem {
  id: string;
  dogId: string;
  imageUrl: string;
  uploadedAt: Date;
  dogName: string;
  userId: string;
  userName: string | null;
}

export interface NotificationStats {
  totalUsers: number;
  usersWithToken: number;
  prefStats: {
    matches: number;
    messages: number;
    reminders: number;
    feed: number;
  };
}

// ── Port interface ────────────────────────────────────────────────────────────

export interface AdminDataRepository {
  // Dashboard
  getStats(): Promise<DashboardStats>;
  getAnalyticsDbMetrics(): Promise<AnalyticsDbMetrics>;

  // Audit log
  listAuditLog(filters: AuditLogFilters): Promise<PaginatedResult<AuditLogEntry>>;

  // Dogs
  listDogs(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminDogListItem>>;
  getDog(id: string): Promise<AdminDogDetail | null>;

  // Reports
  listReports(input: {
    page: number;
    pageSize: number;
    status?: string;
  }): Promise<{ items: AdminReportItem[]; total: number }>;
  getReportUserInfos(userIds: string[]): Promise<AdminReportUserInfo[]>;
  findReportById(
    id: string,
  ): Promise<{ id: string; status: string; reportedUserId: string } | null>;
  resolveReport(
    id: string,
    status: string,
    resolvedBy: string,
    resolvedAction: string,
  ): Promise<void>;
  deactivateUser(userId: string): Promise<void>;

  // Feed
  listFeedPosts(input: {
    page: number;
    pageSize: number;
    status?: string;
    search?: string;
  }): Promise<AdminFeedPostsResult>;
  findPostById(id: string): Promise<{ id: string; moderationStatus: string } | null>;
  updatePostModeration(postId: string, status: string): Promise<void>;
  softDeletePost(postId: string): Promise<void>;

  // Stories
  listStories(input: { page: number; pageSize: number }): Promise<PaginatedResult<AdminStoryItem>>;
  findStoryById(id: string): Promise<{ id: string } | null>;
  deleteStory(id: string): Promise<void>;
  getFeedStats(): Promise<FeedStats>;

  // Group events
  listGroupEvents(input: {
    page: number;
    pageSize: number;
    search?: string;
    status?: string;
    category?: string;
  }): Promise<{
    items: AdminGroupEventItem[];
    total: number;
    participantCounts: AdminGroupEventParticipantCount[];
  }>;
  getGroupEvent(id: string): Promise<{
    event: AdminGroupEventDetail;
    participants: AdminEventParticipant[];
  } | null>;
  findGroupEventById(id: string): Promise<{ id: string; status: string } | null>;
  cancelGroupEvent(id: string): Promise<void>;
  findParticipantById(id: string): Promise<{ id: string } | null>;
  removeParticipant(id: string): Promise<void>;

  // Organizations
  listOrganizations(input: {
    page: number;
    pageSize: number;
    search?: string;
    type?: string;
  }): Promise<{
    items: AdminOrganizationItem[];
    total: number;
    memberCounts: { organizationId: string; count: number }[];
  }>;
  getOrganization(id: string): Promise<{
    organization: AdminOrganizationDetail;
    members: AdminOrganizationMember[];
  } | null>;
  findOrganizationById(id: string): Promise<AdminOrganizationDetail | null>;
  verifyOrganization(id: string, verifiedBy: string): Promise<void>;
  revokeOrganization(id: string): Promise<void>;

  // Event sponsors
  listEventSponsors(eventId: string): Promise<AdminEventSponsorItem[]>;
  findEventSponsor(eventId: string, organizationId: string): Promise<{ id: string } | null>;
  countEventSponsorsByTier(eventId: string, tier: string): Promise<number>;
  addEventSponsor(input: {
    eventId: string;
    organizationId: string;
    tier: string;
    logoPlacement: string;
  }): Promise<AdminEventSponsorRow>;
  removeEventSponsor(eventId: string, organizationId: string): Promise<void>;

  // Users
  listUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    sortBy?: string;
    sortOrder?: string;
  }): Promise<{
    items: AdminUserListItem[];
    total: number;
    dogCounts: { ownerId: string; count: number }[];
  }>;
  getUser(id: string): Promise<{
    user: AdminUserDetail;
    dogs: AdminUserDog[];
    reportsCount: number;
    matchesCount: number;
  } | null>;
  findUserById(id: string): Promise<{ id: string; isActive: boolean } | null>;
  setUserActive(userId: string, isActive: boolean): Promise<void>;
  cancelDeletion(userId: string): Promise<void>;

  // Account deletions
  listPendingDeletions(input: {
    page: number;
    pageSize: number;
  }): Promise<PaginatedResult<AdminDeletionItem>>;

  // Safety
  listSosAlerts(input: {
    page: number;
    pageSize: number;
    type?: string;
  }): Promise<PaginatedResult<AdminSosAlertItem>>;
  listEmergencyContacts(input: {
    page: number;
    pageSize: number;
    search?: string;
  }): Promise<PaginatedResult<AdminEmergencyContactItem>>;

  // Admin users
  listAdminUsers(input: {
    page: number;
    pageSize: number;
    search?: string;
    role?: string;
  }): Promise<PaginatedResult<AdminUserRow>>;
  findAdminUserByEmail(email: string): Promise<{ id: string } | null>;
  createAdminUser(input: {
    email: string;
    displayName: string;
    role: string;
    passwordHash: string;
  }): Promise<AdminUserRow | null>;
  findAdminUserById(
    id: string,
  ): Promise<{ id: string; role: string; isActive: boolean; displayName: string } | null>;
  updateAdminRole(
    id: string,
    role: string,
  ): Promise<{ id: string; email: string; displayName: string; role: string } | null>;
  toggleAdminActive(
    id: string,
    isActive: boolean,
  ): Promise<{
    id: string;
    email: string;
    displayName: string;
    role: string;
    isActive: boolean;
  } | null>;
  updateAdminPassword(id: string, passwordHash: string): Promise<void>;

  // Breeds
  listBreeds(input: {
    page: number;
    pageSize: number;
    search?: string;
    group?: string;
  }): Promise<PaginatedResult<AdminBreedItem>>;
  findBreedById(id: number): Promise<AdminBreedItem | null>;
  createBreed(input: {
    name: string;
    nameIt: string;
    group?: string;
    sizeCategory: string;
    avgWeightKg?: number;
  }): Promise<AdminBreedItem>;
  updateBreed(
    id: number,
    updates: Partial<Omit<AdminBreedItem, 'id'>>,
  ): Promise<AdminBreedItem | null>;
  deleteBreed(id: number): Promise<void>;
  countDogsReferencingBreed(breedName: string): Promise<number>;

  // Photos
  listPendingPhotos(): Promise<PendingPhotoItem[]>;
  findPhotoById(id: string): Promise<{ id: string; moderationStatus: string } | null>;
  updatePhotoModeration(id: string, status: string): Promise<void>;
  approveAllPendingPhotos(): Promise<void>;

  // Notifications
  getActiveUsersWithPushToken(): Promise<{ id: string }[]>;
  getTargetedUsers(userIds: string[]): Promise<{ id: string; pushToken: string | null }[]>;
  getNotificationStats(): Promise<NotificationStats>;
}
