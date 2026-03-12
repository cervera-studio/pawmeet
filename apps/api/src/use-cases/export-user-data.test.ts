import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import type { GdprExportRepository } from '../ports/gdpr-export-repository.js';
import { buildGdprExportRepo } from '../test-utils/builders.js';
import { createExportUserData } from './export-user-data.js';

const NOW = new Date('2026-03-10T10:00:00Z');

function buildProfile(): NonNullable<Awaited<ReturnType<GdprExportRepository['getProfile']>>> {
  return {
    email: 'mario@example.com',
    displayName: 'Mario Rossi',
    authProvider: 'email',
    avatarUrl: null,
    latitude: 41.9028,
    longitude: 12.4964,
    searchRadiusKm: 10,
    emailVerified: true,
    notificationPrefs: { matches: true, messages: true, reminders: true },
    dateOfBirth: new Date('1995-06-15'),
    pushToken: null,
    locationUpdatedAt: null,
    followersCount: 5,
    followingCount: 3,
    createdAt: NOW,
    lastLoginAt: NOW,
  };
}

describe('exportUserData', () => {
  it('fails with USER_NOT_FOUND when user does not exist', async () => {
    const gdprExportRepo = buildGdprExportRepo();
    const exportUserData = createExportUserData({ gdprExportRepo });

    const result = await exportUserData('nonexistent');

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('USER_NOT_FOUND');
    expect(result.error.status).toBe(404);
  });

  it('returns full export with all sections for existing user', async () => {
    const profile = buildProfile();
    const gdprExportRepo = buildGdprExportRepo({
      getProfile: vi.fn().mockResolvedValue(profile),
      getDogsWithPhotos: vi.fn().mockResolvedValue([
        {
          id: 'dog-1',
          name: 'Rex',
          birthDate: NOW,
          breed: 'Labrador',
          breedSecondary: null,
          size: 'grande',
          weightKg: 30,
          gender: 'maschio',
          isNeutered: true,
          energyLevel: 'alta',
          behaviorWithDogs: 'socievole',
          behaviorWithPeople: 'molto_socievole',
          leashBehavior: 'buono',
          recallReliability: 'affidabile',
          bio: null,
          walkPrefTime: ['mattina'],
          walkPrefDurationMin: 30,
          walkPrefDurationMax: 60,
          walkPrefTerrain: ['parco'],
          createdAt: NOW,
          photos: [
            {
              url: 'https://cdn.example.com/dog.jpg',
              position: 0,
              isPrimary: true,
              uploadedAt: NOW,
            },
          ],
        },
      ]),
      getMatches: vi.fn().mockResolvedValue([
        {
          id: 'match-1',
          dogAId: 'dog-1',
          dogBId: 'dog-2',
          compatibilityScore: 0.85,
          isActive: true,
          createdAt: NOW,
        },
      ]),
      getSwipes: vi
        .fn()
        .mockResolvedValue([
          { swiperDogId: 'dog-1', swipedDogId: 'dog-2', direction: 'like', createdAt: NOW },
        ]),
      getDmMessages: vi
        .fn()
        .mockResolvedValue([
          { matchId: 'match-1', content: 'Ciao!', sentByMe: true, createdAt: NOW },
        ]),
      getWalks: vi.fn().mockResolvedValue([
        {
          title: 'Passeggiata al parco',
          scheduledAt: NOW,
          durationMin: 30,
          location: 'Villa Borghese',
          latitude: 41.9,
          longitude: 12.5,
          status: 'completed',
          notes: null,
          createdAt: NOW,
        },
      ]),
      getConsents: vi.fn().mockResolvedValue([
        {
          consentType: 'analytics',
          consentVersion: 'v1.0',
          granted: true,
          grantedAt: NOW,
          withdrawnAt: null,
          ipAddress: '192.168.1.1',
          userAgent: 'DogWalk/1.0',
          source: 'mobile_onboarding',
        },
      ]),
    });

    const exportUserData = createExportUserData({ gdprExportRepo });
    const result = await exportUserData('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;

    const data = result.data;

    // Profile section
    expect(data.profile.email).toBe('mario@example.com');
    expect(data.profile.latitude).toBe(41.9028);
    expect(data.profile.longitude).toBe(12.4964);
    expect(data.profile.notificationPrefs).toEqual({
      matches: true,
      messages: true,
      reminders: true,
    });
    expect(data.profile.dateOfBirth).toBe('1995-06-15T00:00:00.000Z');
    expect(data.profile.followersCount).toBe(5);

    // Dogs section
    expect(data.dogs).toHaveLength(1);
    expect(data.dogs[0].name).toBe('Rex');
    expect(data.dogs[0].weightKg).toBe(30);
    expect(data.dogs[0].gender).toBe('maschio');
    expect(data.dogs[0].behaviorWithDogs).toBe('socievole');
    expect(data.dogs[0].photos).toHaveLength(1);
    expect(data.dogs[0].photos[0].url).toBe('https://cdn.example.com/dog.jpg');

    // Matches section
    expect(data.matches).toHaveLength(1);
    expect(data.matches[0].compatibilityScore).toBe(0.85);

    // Swipes section
    expect(data.swipes).toHaveLength(1);
    expect(data.swipes[0].direction).toBe('like');

    // DM messages section
    expect(data.dmMessages).toHaveLength(1);
    expect(data.dmMessages[0].sentByMe).toBe(true);

    // Walks section
    expect(data.walks).toHaveLength(1);
    expect(data.walks[0].status).toBe('completed');

    // Consents section
    expect(data.consents).toHaveLength(1);
    expect(data.consents[0].consentType).toBe('analytics');

    // GDPR info section
    expect(data.gdprInfo.articles).toHaveLength(2);
    expect(data.gdprInfo.dataRecipients.length).toBeGreaterThan(0);
    expect(data.gdprInfo.algorithmInfo.description).toBeTruthy();

    // All dates are ISO strings
    expect(data.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(data.profile.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('passes dogIds to match/swipe/badge queries', async () => {
    const gdprExportRepo = buildGdprExportRepo({
      getProfile: vi.fn().mockResolvedValue(buildProfile()),
      getDogsWithPhotos: vi.fn().mockResolvedValue([
        {
          id: 'dog-1',
          name: 'Rex',
          birthDate: NOW,
          breed: 'Labrador',
          breedSecondary: null,
          size: 'grande',
          weightKg: 30,
          gender: 'maschio',
          isNeutered: true,
          energyLevel: 'alta',
          behaviorWithDogs: 'socievole',
          behaviorWithPeople: 'molto_socievole',
          leashBehavior: 'buono',
          recallReliability: null,
          bio: null,
          walkPrefTime: [],
          walkPrefDurationMin: 30,
          walkPrefDurationMax: 60,
          walkPrefTerrain: [],
          createdAt: NOW,
          photos: [],
        },
        {
          id: 'dog-2',
          name: 'Luna',
          birthDate: NOW,
          breed: 'Golden',
          breedSecondary: null,
          size: 'grande',
          weightKg: 25,
          gender: 'femmina',
          isNeutered: false,
          energyLevel: 'media',
          behaviorWithDogs: 'socievole',
          behaviorWithPeople: 'socievole',
          leashBehavior: 'eccellente',
          recallReliability: null,
          bio: null,
          walkPrefTime: [],
          walkPrefDurationMin: 30,
          walkPrefDurationMax: 60,
          walkPrefTerrain: [],
          createdAt: NOW,
          photos: [],
        },
      ]),
    });

    const exportUserData = createExportUserData({ gdprExportRepo });
    await exportUserData('user-1');

    // Verify dogIds are passed to dependent queries
    expect(gdprExportRepo.getMatches).toHaveBeenCalledWith(['dog-1', 'dog-2']);
    expect(gdprExportRepo.getSwipes).toHaveBeenCalledWith(['dog-1', 'dog-2']);
    expect(gdprExportRepo.getBadges).toHaveBeenCalledWith(['dog-1', 'dog-2']);
    expect(gdprExportRepo.getSwipeScoreLogs).toHaveBeenCalledWith(['dog-1', 'dog-2']);
  });

  it('passes matchIds to DM messages and walks queries', async () => {
    const gdprExportRepo = buildGdprExportRepo({
      getProfile: vi.fn().mockResolvedValue(buildProfile()),
      getDogsWithPhotos: vi.fn().mockResolvedValue([
        {
          id: 'dog-1',
          name: 'Rex',
          birthDate: NOW,
          breed: 'Labrador',
          breedSecondary: null,
          size: 'grande',
          weightKg: 30,
          gender: 'maschio',
          isNeutered: true,
          energyLevel: 'alta',
          behaviorWithDogs: 'socievole',
          behaviorWithPeople: 'molto_socievole',
          leashBehavior: 'buono',
          recallReliability: null,
          bio: null,
          walkPrefTime: [],
          walkPrefDurationMin: 30,
          walkPrefDurationMax: 60,
          walkPrefTerrain: [],
          createdAt: NOW,
          photos: [],
        },
      ]),
      getMatches: vi.fn().mockResolvedValue([
        {
          id: 'match-1',
          dogAId: 'dog-1',
          dogBId: 'dog-x',
          compatibilityScore: 0.7,
          isActive: true,
          createdAt: NOW,
        },
        {
          id: 'match-2',
          dogAId: 'dog-y',
          dogBId: 'dog-1',
          compatibilityScore: 0.6,
          isActive: false,
          createdAt: NOW,
        },
      ]),
    });

    const exportUserData = createExportUserData({ gdprExportRepo });
    await exportUserData('user-1');

    expect(gdprExportRepo.getDmMessages).toHaveBeenCalledWith('user-1', ['match-1', 'match-2']);
    expect(gdprExportRepo.getWalks).toHaveBeenCalledWith(['match-1', 'match-2']);
  });

  it('returns empty arrays when user has no data', async () => {
    const gdprExportRepo = buildGdprExportRepo({
      getProfile: vi.fn().mockResolvedValue(buildProfile()),
    });

    const exportUserData = createExportUserData({ gdprExportRepo });
    const result = await exportUserData('user-1');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;

    expect(result.data.dogs).toEqual([]);
    expect(result.data.posts).toEqual([]);
    expect(result.data.matches).toEqual([]);
    expect(result.data.swipes).toEqual([]);
    expect(result.data.dmMessages).toEqual([]);
    expect(result.data.groupMessages).toEqual([]);
    expect(result.data.walks).toEqual([]);
    expect(result.data.walkTracks).toEqual([]);
    expect(result.data.stories).toEqual([]);
    expect(result.data.followers).toEqual([]);
    expect(result.data.following).toEqual([]);
    expect(result.data.blocks).toEqual([]);
    expect(result.data.groupEvents).toEqual([]);
    expect(result.data.gamification.xpTransactions).toEqual([]);
    expect(result.data.gamification.achievements).toEqual([]);
    expect(result.data.gamification.challenges).toEqual([]);
    expect(result.data.gamification.badges).toEqual([]);
    expect(result.data.consents).toEqual([]);
    expect(result.data.comments).toEqual([]);
    expect(result.data.feedbackGiven).toEqual([]);
    expect(result.data.postLikes).toEqual([]);
    expect(result.data.dailyActivity).toEqual([]);
    expect(result.data.swipeScoreLogs).toEqual([]);
    expect(result.data.contentReports).toEqual([]);
    expect(result.data.userReports).toEqual([]);
    expect(result.data.gdprInfo.algorithmInfo.weights).toBeNull();
  });
});
