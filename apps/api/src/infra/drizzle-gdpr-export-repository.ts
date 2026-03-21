import {
  achievements,
  analyticsEvents,
  badges,
  challenges,
  contentReports,
  dailyActivity,
  dogMoodLogs,
  dogPhotos,
  dogProfiles,
  emergencyContacts,
  gdprExports,
  groupEventParticipants,
  groupEvents,
  groupMessages,
  matches,
  messages,
  mlTrainingSamples,
  notificationLog,
  oauthAccounts,
  postComments,
  postLikes,
  postMedia,
  posts,
  reports,
  stories,
  supportMessages,
  supportTickets,
  swipeScoreLogs,
  swipes,
  userBlocks,
  userChallenges,
  userConsents,
  userFollows,
  userMatchingPreferences,
  users,
  walkFeedback,
  walkSafetyCheckins,
  walks,
  walkTrackPoints,
  walkTracks,
  xpTransactions,
} from '@pawmeet/db';
import { and, eq, inArray, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  GdprAnalyticsEvent,
  GdprContentReport,
  GdprDailyActivity,
  GdprDmMessage,
  GdprDog,
  GdprEmergencyContact,
  GdprExportRecord,
  GdprExportRepository,
  GdprMatchingPreferences,
  GdprMlTrainingSample,
  GdprMoodLog,
  GdprNotification,
  GdprOAuthAccount,
  GdprPost,
  GdprPostLike,
  GdprProfile,
  GdprSafetyCheckin,
  GdprSupportTicket,
  GdprSwipeScoreLog,
  GdprUserReport,
  GdprWalkTrack,
} from '../ports/gdpr-export-repository.js';

export class DrizzleGdprExportRepository implements GdprExportRepository {
  constructor(private db: NeonHttpDatabase) {}

  // -- Profile --

  async getProfile(userId: string): Promise<GdprProfile | null> {
    const rows = await this.db
      .select({
        email: users.email,
        displayName: users.displayName,
        authProvider: users.authProvider,
        avatarUrl: users.avatarUrl,
        latitude: users.latitude,
        longitude: users.longitude,
        locationUpdatedAt: users.locationUpdatedAt,
        searchRadiusKm: users.searchRadiusKm,
        emailVerified: users.emailVerified,
        notificationPrefs: users.notificationPrefs,
        dateOfBirth: users.dateOfBirth,
        pushToken: users.pushToken,
        followersCount: users.followersCount,
        followingCount: users.followingCount,
        createdAt: users.createdAt,
        lastLoginAt: users.lastLoginAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return (rows[0] as GdprProfile | undefined) ?? null;
  }

  // -- Dogs --

  async getDogsWithPhotos(userId: string): Promise<GdprDog[]> {
    const dogRows = await this.db
      .select({
        id: dogProfiles.id,
        name: dogProfiles.name,
        birthDate: dogProfiles.birthDate,
        breed: dogProfiles.breed,
        breedSecondary: dogProfiles.breedSecondary,
        size: dogProfiles.size,
        weightKg: dogProfiles.weightKg,
        gender: dogProfiles.gender,
        isNeutered: dogProfiles.isNeutered,
        energyLevel: dogProfiles.energyLevel,
        behaviorWithDogs: dogProfiles.behaviorWithDogs,
        behaviorWithPeople: dogProfiles.behaviorWithPeople,
        leashBehavior: dogProfiles.leashBehavior,
        recallReliability: dogProfiles.recallReliability,
        bio: dogProfiles.bio,
        walkPrefTime: dogProfiles.walkPrefTime,
        walkPrefDurationMin: dogProfiles.walkPrefDurationMin,
        walkPrefDurationMax: dogProfiles.walkPrefDurationMax,
        walkPrefTerrain: dogProfiles.walkPrefTerrain,
        createdAt: dogProfiles.createdAt,
      })
      .from(dogProfiles)
      .where(eq(dogProfiles.ownerId, userId));

    if (dogRows.length === 0) return [];

    const dogIds = dogRows.map((d) => d.id);
    const photoRows = await this.db
      .select({
        dogId: dogPhotos.dogId,
        url: dogPhotos.url,
        position: dogPhotos.position,
        isPrimary: dogPhotos.isPrimary,
        uploadedAt: dogPhotos.uploadedAt,
      })
      .from(dogPhotos)
      .where(inArray(dogPhotos.dogId, dogIds));

    const photosByDog = new Map<string, GdprDog['photos']>();
    for (const p of photoRows) {
      const arr = photosByDog.get(p.dogId) ?? [];
      arr.push({
        url: p.url,
        position: p.position,
        isPrimary: p.isPrimary,
        uploadedAt: p.uploadedAt,
      });
      photosByDog.set(p.dogId, arr);
    }

    return dogRows.map((d) => ({
      ...d,
      photos: photosByDog.get(d.id) ?? [],
    }));
  }

  // -- Posts --

  async getPostsWithMedia(userId: string): Promise<GdprPost[]> {
    const postRows = await this.db
      .select({
        id: posts.id,
        caption: posts.caption,
        latitude: posts.latitude,
        longitude: posts.longitude,
        likesCount: posts.likesCount,
        commentsCount: posts.commentsCount,
        createdAt: posts.createdAt,
      })
      .from(posts)
      .where(and(eq(posts.authorId, userId), eq(posts.isDeleted, false)));

    if (postRows.length === 0) return [];

    const postIds = postRows.map((p) => p.id);
    const mediaRows = await this.db
      .select({
        postId: postMedia.postId,
        url: postMedia.url,
        mediaType: postMedia.mediaType,
        position: postMedia.position,
      })
      .from(postMedia)
      .where(inArray(postMedia.postId, postIds));

    const mediaByPost = new Map<string, GdprPost['media']>();
    for (const m of mediaRows) {
      const arr = mediaByPost.get(m.postId) ?? [];
      arr.push({ url: m.url, mediaType: m.mediaType, position: m.position });
      mediaByPost.set(m.postId, arr);
    }

    return postRows.map((p) => ({
      caption: p.caption,
      latitude: p.latitude,
      longitude: p.longitude,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      createdAt: p.createdAt,
      media: mediaByPost.get(p.id) ?? [],
    }));
  }

  // -- Matches --

  async getMatches(dogIds: string[]) {
    if (dogIds.length === 0) return [];
    return this.db
      .select({
        id: matches.id,
        dogAId: matches.dogAId,
        dogBId: matches.dogBId,
        compatibilityScore: matches.compatibilityScore,
        isActive: matches.isActive,
        createdAt: matches.createdAt,
      })
      .from(matches)
      .where(or(inArray(matches.dogAId, dogIds), inArray(matches.dogBId, dogIds)));
  }

  // -- Swipes --

  async getSwipes(dogIds: string[]) {
    if (dogIds.length === 0) return [];
    return this.db
      .select({
        swiperDogId: swipes.swiperDogId,
        swipedDogId: swipes.swipedDogId,
        direction: swipes.direction,
        createdAt: swipes.createdAt,
      })
      .from(swipes)
      .where(inArray(swipes.swiperDogId, dogIds));
  }

  // -- DM Messages --

  async getDmMessages(userId: string, matchIds: string[]): Promise<GdprDmMessage[]> {
    if (matchIds.length === 0) return [];
    const rows = await this.db
      .select({
        matchId: messages.matchId,
        content: messages.content,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(and(inArray(messages.matchId, matchIds), eq(messages.isDeleted, false)));

    return rows.map((r) => ({
      matchId: r.matchId,
      content: r.content,
      sentByMe: r.senderId === userId,
      createdAt: r.createdAt,
    }));
  }

  // -- Group Messages --

  async getGroupMessages(userId: string) {
    return this.db
      .select({
        eventId: groupMessages.eventId,
        content: groupMessages.content,
        createdAt: groupMessages.createdAt,
      })
      .from(groupMessages)
      .where(and(eq(groupMessages.senderId, userId), eq(groupMessages.isDeleted, false)));
  }

  // -- Walks --

  async getWalks(matchIds: string[]) {
    if (matchIds.length === 0) return [];
    return this.db
      .select({
        title: walks.title,
        scheduledAt: walks.scheduledAt,
        durationMin: walks.durationMin,
        location: walks.location,
        latitude: walks.latitude,
        longitude: walks.longitude,
        status: walks.status,
        notes: walks.notes,
        createdAt: walks.createdAt,
      })
      .from(walks)
      .where(inArray(walks.matchId, matchIds));
  }

  // -- Walk Tracks --

  async getWalkTracksWithPoints(userId: string): Promise<GdprWalkTrack[]> {
    const trackRows = await this.db
      .select({
        id: walkTracks.id,
        startedAt: walkTracks.startedAt,
        endedAt: walkTracks.endedAt,
        distanceKm: walkTracks.distanceKm,
        durationMinutes: walkTracks.durationMinutes,
        avgSpeedKmh: walkTracks.avgSpeedKmh,
      })
      .from(walkTracks)
      .where(eq(walkTracks.userId, userId));

    if (trackRows.length === 0) return [];

    const trackIds = trackRows.map((t) => t.id);
    const pointRows = await this.db
      .select({
        trackId: walkTrackPoints.trackId,
        latitude: walkTrackPoints.latitude,
        longitude: walkTrackPoints.longitude,
        altitude: walkTrackPoints.altitude,
        timestamp: walkTrackPoints.timestamp,
      })
      .from(walkTrackPoints)
      .where(inArray(walkTrackPoints.trackId, trackIds));

    const pointsByTrack = new Map<string, GdprWalkTrack['points']>();
    for (const p of pointRows) {
      const arr = pointsByTrack.get(p.trackId) ?? [];
      arr.push({
        latitude: p.latitude,
        longitude: p.longitude,
        altitude: p.altitude,
        timestamp: p.timestamp,
      });
      pointsByTrack.set(p.trackId, arr);
    }

    return trackRows.map((t) => ({
      startedAt: t.startedAt,
      endedAt: t.endedAt,
      distanceKm: t.distanceKm,
      durationMinutes: t.durationMinutes,
      avgSpeedKmh: t.avgSpeedKmh,
      points: pointsByTrack.get(t.id) ?? [],
    }));
  }

  // -- Stories --

  async getStories(userId: string) {
    return this.db
      .select({
        mediaUrl: stories.mediaUrl,
        mediaType: stories.mediaType,
        viewCount: stories.viewCount,
        createdAt: stories.createdAt,
      })
      .from(stories)
      .where(eq(stories.authorId, userId));
  }

  // -- Follows --

  async getFollowers(userId: string) {
    return this.db
      .select({ userId: userFollows.followerId, createdAt: userFollows.createdAt })
      .from(userFollows)
      .where(eq(userFollows.followingId, userId));
  }

  async getFollowing(userId: string) {
    return this.db
      .select({ userId: userFollows.followingId, createdAt: userFollows.createdAt })
      .from(userFollows)
      .where(eq(userFollows.followerId, userId));
  }

  // -- Blocks --

  async getBlocks(userId: string) {
    return this.db
      .select({ blockedUserId: userBlocks.blockedId, createdAt: userBlocks.createdAt })
      .from(userBlocks)
      .where(eq(userBlocks.blockerId, userId));
  }

  // -- Group Events --

  async getGroupEventParticipation(userId: string) {
    return this.db
      .select({
        eventTitle: groupEvents.title,
        eventScheduledAt: groupEvents.scheduledAt,
        eventLocation: groupEvents.location,
        status: groupEventParticipants.status,
        isOrganizer: groupEventParticipants.isOrganizer,
        joinedAt: groupEventParticipants.joinedAt,
      })
      .from(groupEventParticipants)
      .innerJoin(groupEvents, eq(groupEventParticipants.eventId, groupEvents.id))
      .where(eq(groupEventParticipants.userId, userId));
  }

  // -- Gamification --

  async getXpTransactions(userId: string) {
    return this.db
      .select({
        action: xpTransactions.action,
        points: xpTransactions.points,
        createdAt: xpTransactions.createdAt,
      })
      .from(xpTransactions)
      .where(eq(xpTransactions.userId, userId));
  }

  async getAchievements(userId: string) {
    return this.db
      .select({ type: achievements.type, unlockedAt: achievements.unlockedAt })
      .from(achievements)
      .where(eq(achievements.userId, userId));
  }

  async getChallenges(userId: string) {
    return this.db
      .select({
        title: challenges.title,
        description: challenges.description,
        targetValue: challenges.targetValue,
        progress: userChallenges.progress,
        completedAt: userChallenges.completedAt,
        createdAt: userChallenges.createdAt,
      })
      .from(userChallenges)
      .innerJoin(challenges, eq(userChallenges.challengeId, challenges.id))
      .where(eq(userChallenges.userId, userId));
  }

  async getBadges(dogIds: string[]) {
    if (dogIds.length === 0) return [];
    return this.db
      .select({ dogId: badges.dogId, type: badges.type, awardedAt: badges.awardedAt })
      .from(badges)
      .where(inArray(badges.dogId, dogIds));
  }

  // -- Consents (now including IP + userAgent) --

  async getConsents(userId: string) {
    return this.db
      .select({
        consentType: userConsents.consentType,
        consentVersion: userConsents.consentVersion,
        granted: userConsents.granted,
        grantedAt: userConsents.grantedAt,
        withdrawnAt: userConsents.withdrawnAt,
        ipAddress: userConsents.ipAddress,
        userAgent: userConsents.userAgent,
        source: userConsents.source,
      })
      .from(userConsents)
      .where(eq(userConsents.userId, userId));
  }

  // -- Comments --

  async getComments(userId: string) {
    return this.db
      .select({
        postId: postComments.postId,
        content: postComments.content,
        createdAt: postComments.createdAt,
      })
      .from(postComments)
      .where(and(eq(postComments.authorId, userId), eq(postComments.isDeleted, false)));
  }

  // -- Feedback --

  async getFeedbackGiven(userId: string) {
    return this.db
      .select({
        walkId: walkFeedback.walkId,
        toDogId: walkFeedback.toDogId,
        rating: walkFeedback.rating,
        comment: walkFeedback.comment,
        createdAt: walkFeedback.createdAt,
      })
      .from(walkFeedback)
      .where(eq(walkFeedback.fromUserId, userId));
  }

  // -- Post likes --

  async getPostLikes(userId: string): Promise<GdprPostLike[]> {
    return this.db
      .select({ postId: postLikes.postId, createdAt: postLikes.createdAt })
      .from(postLikes)
      .where(eq(postLikes.userId, userId));
  }

  // -- Daily activity --

  async getDailyActivity(userId: string): Promise<GdprDailyActivity[]> {
    return this.db
      .select({
        date: dailyActivity.date,
        stepsCount: dailyActivity.stepsCount,
        walkDistanceKm: dailyActivity.walkDistanceKm,
        walkDurationMin: dailyActivity.walkDurationMin,
        walkCount: dailyActivity.walkCount,
        source: dailyActivity.source,
      })
      .from(dailyActivity)
      .where(eq(dailyActivity.userId, userId));
  }

  // -- Matching preferences --

  async getMatchingPreferences(userId: string): Promise<GdprMatchingPreferences | null> {
    const rows = await this.db
      .select({
        weightSize: userMatchingPreferences.weightSize,
        weightEnergy: userMatchingPreferences.weightEnergy,
        weightBehavior: userMatchingPreferences.weightBehavior,
        weightWalk: userMatchingPreferences.weightWalk,
        weightDistance: userMatchingPreferences.weightDistance,
        weightLeash: userMatchingPreferences.weightLeash,
        sampleSize: userMatchingPreferences.sampleSize,
        successRate: userMatchingPreferences.successRate,
      })
      .from(userMatchingPreferences)
      .where(eq(userMatchingPreferences.userId, userId))
      .limit(1);

    return rows[0] ?? null;
  }

  // -- Swipe score logs --

  async getSwipeScoreLogs(dogIds: string[]): Promise<GdprSwipeScoreLog[]> {
    if (dogIds.length === 0) return [];
    return this.db
      .select({
        swiperDogId: swipeScoreLogs.swiperDogId,
        swipedDogId: swipeScoreLogs.swipedDogId,
        direction: swipeScoreLogs.direction,
        sizeScore: swipeScoreLogs.sizeScore,
        energyScore: swipeScoreLogs.energyScore,
        behaviorScore: swipeScoreLogs.behaviorScore,
        walkScore: swipeScoreLogs.walkScore,
        distanceScore: swipeScoreLogs.distanceScore,
        leashScore: swipeScoreLogs.leashScore,
        overallScore: swipeScoreLogs.overallScore,
        createdAt: swipeScoreLogs.createdAt,
      })
      .from(swipeScoreLogs)
      .where(inArray(swipeScoreLogs.swiperDogId, dogIds));
  }

  // -- Content reports --

  async getContentReports(userId: string): Promise<GdprContentReport[]> {
    return this.db
      .select({
        contentType: contentReports.contentType,
        contentId: contentReports.contentId,
        reason: contentReports.reason,
        description: contentReports.description,
        status: contentReports.status,
        createdAt: contentReports.createdAt,
      })
      .from(contentReports)
      .where(eq(contentReports.reporterId, userId));
  }

  async getUserReports(userId: string): Promise<GdprUserReport[]> {
    return this.db
      .select({
        reportedUserId: reports.reportedUserId,
        reason: reports.reason,
        description: reports.description,
        status: reports.status,
        createdAt: reports.createdAt,
      })
      .from(reports)
      .where(eq(reports.reporterId, userId));
  }

  async getAnalyticsEvents(userId: string): Promise<GdprAnalyticsEvent[]> {
    return this.db
      .select({
        eventName: analyticsEvents.eventName,
        properties: analyticsEvents.properties,
        clientTimestamp: analyticsEvents.clientTimestamp,
        serverTimestamp: analyticsEvents.serverTimestamp,
        platform: analyticsEvents.platform,
        screenName: analyticsEvents.screenName,
      })
      .from(analyticsEvents)
      .where(eq(analyticsEvents.userId, userId));
  }

  // -- OAuth accounts --

  async getOAuthAccounts(userId: string): Promise<GdprOAuthAccount[]> {
    return this.db
      .select({
        provider: oauthAccounts.provider,
        providerEmail: oauthAccounts.providerEmail,
        linkedAt: oauthAccounts.linkedAt,
      })
      .from(oauthAccounts)
      .where(eq(oauthAccounts.userId, userId)) as unknown as GdprOAuthAccount[];
  }

  // -- Emergency contacts --

  async getEmergencyContacts(userId: string): Promise<GdprEmergencyContact[]> {
    return this.db
      .select({
        name: emergencyContacts.name,
        phone: emergencyContacts.phone,
        relationship: emergencyContacts.relationship,
        createdAt: emergencyContacts.createdAt,
      })
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, userId)) as unknown as GdprEmergencyContact[];
  }

  // -- Walk safety check-ins --

  async getSafetyCheckins(userId: string): Promise<GdprSafetyCheckin[]> {
    return this.db
      .select({
        walkId: walkSafetyCheckins.walkId,
        type: walkSafetyCheckins.type,
        latitude: walkSafetyCheckins.latitude,
        longitude: walkSafetyCheckins.longitude,
        createdAt: walkSafetyCheckins.createdAt,
      })
      .from(walkSafetyCheckins)
      .where(eq(walkSafetyCheckins.userId, userId)) as unknown as GdprSafetyCheckin[];
  }

  // -- Dog mood logs --

  async getMoodLogs(userId: string): Promise<GdprMoodLog[]> {
    return this.db
      .select({
        dogId: dogMoodLogs.dogId,
        trackId: dogMoodLogs.trackId,
        rating: dogMoodLogs.rating,
        tags: dogMoodLogs.tags,
        notes: dogMoodLogs.notes,
        createdAt: dogMoodLogs.createdAt,
      })
      .from(dogMoodLogs)
      .where(eq(dogMoodLogs.userId, userId)) as unknown as GdprMoodLog[];
  }

  // -- Support tickets --

  async getSupportTickets(userId: string): Promise<GdprSupportTicket[]> {
    const tickets = await this.db
      .select({
        id: supportTickets.id,
        subject: supportTickets.subject,
        category: supportTickets.category,
        status: supportTickets.status,
        createdAt: supportTickets.createdAt,
      })
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId));

    const result: GdprSupportTicket[] = [];
    for (const t of tickets) {
      const msgs = await this.db
        .select({
          senderType: supportMessages.senderType,
          content: supportMessages.content,
          createdAt: supportMessages.createdAt,
        })
        .from(supportMessages)
        .where(
          and(
            eq(supportMessages.ticketId, t.id),
            eq(supportMessages.isInternal, false),
          ),
        );

      result.push({
        subject: t.subject,
        category: t.category,
        status: t.status,
        createdAt: t.createdAt,
        messages: msgs as unknown as GdprSupportTicket['messages'],
      });
    }
    return result;
  }

  // -- Notifications --

  async getNotifications(userId: string): Promise<GdprNotification[]> {
    return this.db
      .select({
        type: notificationLog.type,
        title: notificationLog.title,
        body: notificationLog.body,
        readAt: notificationLog.readAt,
        createdAt: notificationLog.createdAt,
      })
      .from(notificationLog)
      .where(eq(notificationLog.userId, userId)) as unknown as GdprNotification[];
  }

  // -- ML training samples --

  async getMlTrainingSamples(dogIds: string[]): Promise<GdprMlTrainingSample[]> {
    if (dogIds.length === 0) return [];
    return this.db
      .select({
        matchId: mlTrainingSamples.matchId,
        outcomeLabel: mlTrainingSamples.outcomeLabel,
        labelVersion: mlTrainingSamples.labelVersion,
        maturedAt: mlTrainingSamples.maturedAt,
        createdAt: mlTrainingSamples.createdAt,
      })
      .from(mlTrainingSamples)
      .where(
        or(
          inArray(mlTrainingSamples.dogAId, dogIds),
          inArray(mlTrainingSamples.dogBId, dogIds),
        ),
      ) as unknown as GdprMlTrainingSample[];
  }

  // -- Export status tracking --

  async createExport(userId: string): Promise<GdprExportRecord> {
    const rows = await this.db.insert(gdprExports).values({ userId, status: 'pending' }).returning({
      id: gdprExports.id,
      status: gdprExports.status,
      requestedAt: gdprExports.requestedAt,
      completedAt: gdprExports.completedAt,
    });
    return rows[0] as GdprExportRecord;
  }

  async findPendingExport(userId: string): Promise<GdprExportRecord | null> {
    const rows = await this.db
      .select({
        id: gdprExports.id,
        status: gdprExports.status,
        requestedAt: gdprExports.requestedAt,
        completedAt: gdprExports.completedAt,
      })
      .from(gdprExports)
      .where(
        and(eq(gdprExports.userId, userId), inArray(gdprExports.status, ['pending', 'processing'])),
      )
      .limit(1);

    return rows[0] ?? null;
  }

  async updateExportStatus(
    exportId: string,
    status: string,
    data?: { r2Key?: string; expiresAt?: Date; errorMessage?: string; completedAt?: Date },
  ): Promise<void> {
    await this.db
      .update(gdprExports)
      .set({
        status,
        r2Key: data?.r2Key,
        expiresAt: data?.expiresAt,
        errorMessage: data?.errorMessage,
        completedAt: data?.completedAt,
      })
      .where(eq(gdprExports.id, exportId));
  }
}
