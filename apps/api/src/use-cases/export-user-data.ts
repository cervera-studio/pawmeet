import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { GdprExportRepository } from '../ports/gdpr-export-repository.js';

export interface UserDataExport {
  exportedAt: string;
  gdprInfo: {
    articles: string[];
    dataRecipients: {
      name: string;
      purpose: string;
    }[];
    algorithmInfo: {
      description: string;
      weights: {
        size: number;
        energy: number;
        behavior: number;
        walk: number;
        distance: number;
        leash: number;
      } | null;
    };
  };
  profile: {
    email: string;
    displayName: string;
    authProvider: string;
    avatarUrl: string | null;
    latitude: number | null;
    longitude: number | null;
    locationUpdatedAt: string | null;
    searchRadiusKm: number;
    emailVerified: boolean;
    notificationPrefs: { matches: boolean; messages: boolean; reminders: boolean } | null;
    dateOfBirth: string | null;
    pushToken: string | null;
    followersCount: number;
    followingCount: number;
    createdAt: string;
    lastLoginAt: string | null;
    linkedProviders: {
      provider: string;
      providerEmail: string | null;
      linkedAt: string;
    }[];
  };
  dogs: {
    name: string;
    birthDate: string;
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
    createdAt: string;
    photos: { url: string; position: number; isPrimary: boolean; uploadedAt: string }[];
  }[];
  posts: {
    caption: string | null;
    latitude: number | null;
    longitude: number | null;
    likesCount: number;
    commentsCount: number;
    createdAt: string;
    media: { url: string; mediaType: string; position: number }[];
  }[];
  matches: {
    dogAId: string;
    dogBId: string;
    compatibilityScore: number;
    createdAt: string;
  }[];
  swipes: {
    swiperDogId: string;
    swipedDogId: string;
    direction: string;
    createdAt: string;
  }[];
  dmMessages: {
    matchId: string;
    content: string;
    sentByMe: boolean;
    createdAt: string;
  }[];
  groupMessages: {
    eventId: string;
    content: string;
    createdAt: string;
  }[];
  walks: {
    title: string | null;
    scheduledAt: string;
    durationMin: number;
    location: string | null;
    latitude: number | null;
    longitude: number | null;
    status: string;
    notes: string | null;
    createdAt: string;
  }[];
  walkTracks: {
    startedAt: string;
    endedAt: string | null;
    distanceKm: number;
    durationMinutes: number;
    avgSpeedKmh: number;
    points: { latitude: number; longitude: number; altitude: number | null; timestamp: string }[];
  }[];
  stories: {
    mediaUrl: string;
    mediaType: string;
    viewCount: number;
    createdAt: string;
  }[];
  followers: { userId: string; createdAt: string }[];
  following: { userId: string; createdAt: string }[];
  blocks: { blockedUserId: string; createdAt: string }[];
  groupEvents: {
    eventTitle: string;
    eventScheduledAt: string;
    eventLocation: string;
    status: string;
    isOrganizer: boolean;
    joinedAt: string;
  }[];
  gamification: {
    xpTransactions: { action: string; points: number; createdAt: string }[];
    achievements: { type: string; unlockedAt: string }[];
    challenges: {
      title: string;
      description: string;
      targetValue: number;
      progress: number;
      completedAt: string | null;
      createdAt: string;
    }[];
    badges: { dogId: string; type: string; awardedAt: string }[];
  };
  consents: {
    consentType: string;
    consentVersion: string;
    granted: boolean;
    grantedAt: string;
    withdrawnAt: string | null;
    ipAddress: string | null;
    userAgent: string | null;
    source: string;
  }[];
  comments: { postId: string; content: string; createdAt: string }[];
  feedbackGiven: {
    walkId: string;
    toDogId: string;
    rating: number;
    comment: string | null;
    createdAt: string;
  }[];
  postLikes: { postId: string; createdAt: string }[];
  dailyActivity: {
    date: string;
    stepsCount: number;
    walkDistanceKm: number;
    walkDurationMin: number;
    walkCount: number;
    source: string;
  }[];
  swipeScoreLogs: {
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
    createdAt: string;
  }[];
  contentReports: {
    contentType: string;
    contentId: string;
    reason: string;
    description: string | null;
    status: string;
    createdAt: string;
  }[];
  userReports: {
    reportedUserId: string;
    reason: string;
    description: string | null;
    status: string;
    createdAt: string;
  }[];
  analyticsEvents: {
    eventName: string;
    properties: Record<string, unknown> | null;
    clientTimestamp: string;
    serverTimestamp: string;
    platform: string;
    screenName: string | null;
  }[];
}

interface Deps {
  gdprExportRepo: GdprExportRepository;
}

function toIso(d: Date): string {
  return d.toISOString();
}

function toIsoOrNull(d: Date | null): string | null {
  return d ? d.toISOString() : null;
}

const DATA_RECIPIENTS = [
  { name: 'Neon (PostgreSQL)', purpose: 'Database hosting' },
  { name: 'Cloudflare R2', purpose: 'Object storage (foto, video, export)' },
  { name: 'Resend', purpose: 'Email transazionali' },
  { name: 'Upstash Redis', purpose: 'Rate limiting e cache' },
  { name: 'Sentry', purpose: 'Monitoraggio errori' },
  { name: 'Statsig', purpose: 'Feature flags e A/B testing' },
  { name: 'Fly.io', purpose: 'API server hosting' },
  { name: 'PostHog Cloud EU', purpose: 'Product analytics (dati pseudonimizzati)' },
] as const;

/**
 * Export all user data in a portable JSON format.
 * GDPR Art. 15 (right of access) + Art. 20 (right to data portability).
 */
export function createExportUserData(deps: Deps) {
  return async (userId: string): Promise<Result<UserDataExport>> => {
    const { gdprExportRepo } = deps;

    // Phase 1: fetch profile + dogs + linked providers in parallel
    const [profile, dogs, oauthAccountsData] = await Promise.all([
      gdprExportRepo.getProfile(userId),
      gdprExportRepo.getDogsWithPhotos(userId),
      gdprExportRepo.getOAuthAccounts(userId),
    ]);

    if (!profile) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const dogIds = dogs.map((d) => d.id);

    // Phase 2: fetch matches (needed for walks + DM messages)
    const matchRows = await gdprExportRepo.getMatches(dogIds);
    const matchIds = matchRows.map((m) => m.id);

    // Phase 3: all remaining queries in parallel
    const [
      postsData,
      swipesData,
      dmMessagesData,
      groupMessagesData,
      walksData,
      walkTracksData,
      storiesData,
      followersData,
      followingData,
      blocksData,
      groupEventsData,
      xpData,
      achievementsData,
      challengesData,
      badgesData,
      consentsData,
      commentsData,
      feedbackData,
      postLikesData,
      dailyActivityData,
      matchingPrefs,
      swipeScoreLogsData,
      contentReportsData,
      userReportsData,
      analyticsEventsData,
    ] = await Promise.all([
      gdprExportRepo.getPostsWithMedia(userId),
      gdprExportRepo.getSwipes(dogIds),
      gdprExportRepo.getDmMessages(userId, matchIds),
      gdprExportRepo.getGroupMessages(userId),
      gdprExportRepo.getWalks(matchIds),
      gdprExportRepo.getWalkTracksWithPoints(userId),
      gdprExportRepo.getStories(userId),
      gdprExportRepo.getFollowers(userId),
      gdprExportRepo.getFollowing(userId),
      gdprExportRepo.getBlocks(userId),
      gdprExportRepo.getGroupEventParticipation(userId),
      gdprExportRepo.getXpTransactions(userId),
      gdprExportRepo.getAchievements(userId),
      gdprExportRepo.getChallenges(userId),
      gdprExportRepo.getBadges(dogIds),
      gdprExportRepo.getConsents(userId),
      gdprExportRepo.getComments(userId),
      gdprExportRepo.getFeedbackGiven(userId),
      gdprExportRepo.getPostLikes(userId),
      gdprExportRepo.getDailyActivity(userId),
      gdprExportRepo.getMatchingPreferences(userId),
      gdprExportRepo.getSwipeScoreLogs(dogIds),
      gdprExportRepo.getContentReports(userId),
      gdprExportRepo.getUserReports(userId),
      gdprExportRepo.getAnalyticsEvents(userId),
    ]);

    return succeed({
      exportedAt: new Date().toISOString(),
      gdprInfo: {
        articles: ['Art. 15 - Diritto di accesso', 'Art. 20 - Diritto alla portabilità dei dati'],
        dataRecipients: [...DATA_RECIPIENTS],
        algorithmInfo: {
          description:
            'Il matching tra cani utilizza un algoritmo a punteggio pesato che valuta: taglia (25%), livello energetico (25%), comportamento (20%), preferenze passeggiata (15%), distanza (10%), comportamento al guinzaglio (5%). I pesi vengono personalizzati in base alle tue interazioni.',
          weights: matchingPrefs
            ? {
                size: matchingPrefs.weightSize,
                energy: matchingPrefs.weightEnergy,
                behavior: matchingPrefs.weightBehavior,
                walk: matchingPrefs.weightWalk,
                distance: matchingPrefs.weightDistance,
                leash: matchingPrefs.weightLeash,
              }
            : null,
        },
      },
      profile: {
        email: profile.email,
        displayName: profile.displayName,
        authProvider: profile.authProvider,
        avatarUrl: profile.avatarUrl,
        latitude: profile.latitude,
        longitude: profile.longitude,
        locationUpdatedAt: toIsoOrNull(profile.locationUpdatedAt),
        searchRadiusKm: profile.searchRadiusKm,
        emailVerified: profile.emailVerified,
        notificationPrefs: profile.notificationPrefs,
        dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : null,
        pushToken: profile.pushToken,
        followersCount: profile.followersCount,
        followingCount: profile.followingCount,
        createdAt: toIso(profile.createdAt),
        lastLoginAt: toIsoOrNull(profile.lastLoginAt),
        linkedProviders: oauthAccountsData.map((a) => ({
          provider: a.provider,
          providerEmail: a.providerEmail,
          linkedAt: toIso(a.linkedAt),
        })),
      },
      dogs: dogs.map((d) => ({
        name: d.name,
        birthDate: toIso(d.birthDate),
        breed: d.breed,
        breedSecondary: d.breedSecondary,
        size: d.size,
        weightKg: d.weightKg,
        gender: d.gender,
        isNeutered: d.isNeutered,
        energyLevel: d.energyLevel,
        behaviorWithDogs: d.behaviorWithDogs,
        behaviorWithPeople: d.behaviorWithPeople,
        leashBehavior: d.leashBehavior,
        recallReliability: d.recallReliability,
        bio: d.bio,
        walkPrefTime: d.walkPrefTime,
        walkPrefDurationMin: d.walkPrefDurationMin,
        walkPrefDurationMax: d.walkPrefDurationMax,
        walkPrefTerrain: d.walkPrefTerrain,
        createdAt: toIso(d.createdAt),
        photos: d.photos.map((p) => ({
          url: p.url,
          position: p.position,
          isPrimary: p.isPrimary,
          uploadedAt: toIso(p.uploadedAt),
        })),
      })),
      posts: postsData.map((p) => ({
        caption: p.caption,
        latitude: p.latitude,
        longitude: p.longitude,
        likesCount: p.likesCount,
        commentsCount: p.commentsCount,
        createdAt: toIso(p.createdAt),
        media: p.media,
      })),
      matches: matchRows.map((m) => ({
        dogAId: m.dogAId,
        dogBId: m.dogBId,
        compatibilityScore: m.compatibilityScore,
        createdAt: toIso(m.createdAt),
      })),
      swipes: swipesData.map((s) => ({
        swiperDogId: s.swiperDogId,
        swipedDogId: s.swipedDogId,
        direction: s.direction,
        createdAt: toIso(s.createdAt),
      })),
      dmMessages: dmMessagesData.map((m) => ({
        matchId: m.matchId,
        content: m.content,
        sentByMe: m.sentByMe,
        createdAt: toIso(m.createdAt),
      })),
      groupMessages: groupMessagesData.map((m) => ({
        eventId: m.eventId,
        content: m.content,
        createdAt: toIso(m.createdAt),
      })),
      walks: walksData.map((w) => ({
        title: w.title,
        scheduledAt: toIso(w.scheduledAt),
        durationMin: w.durationMin,
        location: w.location,
        latitude: w.latitude,
        longitude: w.longitude,
        status: w.status,
        notes: w.notes,
        createdAt: toIso(w.createdAt),
      })),
      walkTracks: walkTracksData.map((t) => ({
        startedAt: toIso(t.startedAt),
        endedAt: toIsoOrNull(t.endedAt),
        distanceKm: t.distanceKm,
        durationMinutes: t.durationMinutes,
        avgSpeedKmh: t.avgSpeedKmh,
        points: t.points.map((p) => ({
          latitude: p.latitude,
          longitude: p.longitude,
          altitude: p.altitude,
          timestamp: toIso(p.timestamp),
        })),
      })),
      stories: storiesData.map((s) => ({
        mediaUrl: s.mediaUrl,
        mediaType: s.mediaType,
        viewCount: s.viewCount,
        createdAt: toIso(s.createdAt),
      })),
      followers: followersData.map((f) => ({ userId: f.userId, createdAt: toIso(f.createdAt) })),
      following: followingData.map((f) => ({ userId: f.userId, createdAt: toIso(f.createdAt) })),
      blocks: blocksData.map((b) => ({
        blockedUserId: b.blockedUserId,
        createdAt: toIso(b.createdAt),
      })),
      groupEvents: groupEventsData.map((e) => ({
        eventTitle: e.eventTitle,
        eventScheduledAt: toIso(e.eventScheduledAt),
        eventLocation: e.eventLocation,
        status: e.status,
        isOrganizer: e.isOrganizer,
        joinedAt: toIso(e.joinedAt),
      })),
      gamification: {
        xpTransactions: xpData.map((x) => ({
          action: x.action,
          points: x.points,
          createdAt: toIso(x.createdAt),
        })),
        achievements: achievementsData.map((a) => ({
          type: a.type,
          unlockedAt: toIso(a.unlockedAt),
        })),
        challenges: challengesData.map((c) => ({
          title: c.title,
          description: c.description,
          targetValue: c.targetValue,
          progress: c.progress,
          completedAt: toIsoOrNull(c.completedAt),
          createdAt: toIso(c.createdAt),
        })),
        badges: badgesData.map((b) => ({
          dogId: b.dogId,
          type: b.type,
          awardedAt: toIso(b.awardedAt),
        })),
      },
      consents: consentsData.map((c) => ({
        consentType: c.consentType,
        consentVersion: c.consentVersion,
        granted: c.granted,
        grantedAt: toIso(c.grantedAt),
        withdrawnAt: toIsoOrNull(c.withdrawnAt),
        ipAddress: c.ipAddress,
        userAgent: c.userAgent,
        source: c.source,
      })),
      comments: commentsData.map((c) => ({
        postId: c.postId,
        content: c.content,
        createdAt: toIso(c.createdAt),
      })),
      feedbackGiven: feedbackData.map((f) => ({
        walkId: f.walkId,
        toDogId: f.toDogId,
        rating: f.rating,
        comment: f.comment,
        createdAt: toIso(f.createdAt),
      })),
      postLikes: postLikesData.map((l) => ({
        postId: l.postId,
        createdAt: toIso(l.createdAt),
      })),
      dailyActivity: dailyActivityData,
      swipeScoreLogs: swipeScoreLogsData.map((s) => ({
        swiperDogId: s.swiperDogId,
        swipedDogId: s.swipedDogId,
        direction: s.direction,
        sizeScore: s.sizeScore,
        energyScore: s.energyScore,
        behaviorScore: s.behaviorScore,
        walkScore: s.walkScore,
        distanceScore: s.distanceScore,
        leashScore: s.leashScore,
        overallScore: s.overallScore,
        createdAt: toIso(s.createdAt),
      })),
      contentReports: contentReportsData.map((r) => ({
        contentType: r.contentType,
        contentId: r.contentId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: toIso(r.createdAt),
      })),
      userReports: userReportsData.map((r) => ({
        reportedUserId: r.reportedUserId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: toIso(r.createdAt),
      })),
      analyticsEvents: analyticsEventsData.map((e) => ({
        eventName: e.eventName,
        properties: e.properties,
        clientTimestamp: toIso(e.clientTimestamp),
        serverTimestamp: toIso(e.serverTimestamp),
        platform: e.platform,
        screenName: e.screenName,
      })),
    });
  };
}
