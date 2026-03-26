import { succeed } from '@pawmeet/types';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { clearHandlers, DOMAIN_EVENT, emit } from '../domain/events.js';
import { registerDomainEventHandlers } from './event-handlers.js';

function buildDeps() {
  return {
    chat: { sendToRoom: vi.fn() },
    userRepo: {
      findById: vi.fn().mockResolvedValue({
        id: 'user-1',
        displayName: 'Test User',
        notificationPrefs: { messages: true },
      }),
      findByIds: vi.fn().mockResolvedValue([]),
    },
    notificationService: { send: vi.fn().mockResolvedValue(undefined) },
    supportRepo: {} as Record<string, never>,
    awardXp: vi.fn().mockResolvedValue(
      succeed({
        xpAwarded: 10,
        summary: { level: 'beginner', totalXp: 10 },
        previousLevel: 'beginner',
      }),
    ),
    updateChallengeProgress: vi.fn().mockResolvedValue(succeed({ updated: [] })),
    checkAndUnlockAchievements: vi.fn().mockResolvedValue(succeed([])),
    infra: {
      enqueueMessageToxicityCheck: vi.fn().mockResolvedValue(undefined),
      enqueueNotification: vi.fn().mockResolvedValue(undefined),
      trackEvent: vi.fn(),
      sendToUser: vi.fn(),
    },
  };
}

describe('Domain Event Handlers', () => {
  afterEach(() => {
    clearHandlers();
  });

  describe('MATCH_CREATED', () => {
    it('triggers gamification for match', async () => {
      const deps = buildDeps();
      registerDomainEventHandlers(deps);

      await emit({
        type: DOMAIN_EVENT.MATCH_CREATED,
        payload: { matchId: 'm-1', userId: 'user-1', compatibilityScore: 0.85 },
        timestamp: new Date(),
      });

      expect(deps.awardXp).toHaveBeenCalledWith('user-1', 'match_made');
      expect(deps.updateChallengeProgress).toHaveBeenCalledWith('user-1', 'new_matches', 1);
      expect(deps.checkAndUnlockAchievements).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GROUP_EVENT_JOINED', () => {
    it('triggers gamification for event join', async () => {
      const deps = buildDeps();
      registerDomainEventHandlers(deps);

      await emit({
        type: DOMAIN_EVENT.GROUP_EVENT_JOINED,
        payload: { eventId: 'e-1', userId: 'user-1', participantNumber: 3 },
        timestamp: new Date(),
      });

      expect(deps.awardXp).toHaveBeenCalledWith('user-1', 'group_event_joined');
      expect(deps.updateChallengeProgress).toHaveBeenCalledWith('user-1', 'group_events_joined', 1);
      expect(deps.checkAndUnlockAchievements).toHaveBeenCalledWith('user-1');
    });
  });

  describe('GROUP_EVENT_CANCELLED', () => {
    it('sends notifications to all participants', async () => {
      const deps = buildDeps();
      registerDomainEventHandlers(deps);

      await emit({
        type: DOMAIN_EVENT.GROUP_EVENT_CANCELLED,
        payload: {
          eventId: 'e-1',
          userId: 'user-1',
          eventTitle: 'Passeggiata',
          participantUserIds: ['user-2', 'user-3'],
        },
        timestamp: new Date(),
      });

      expect(deps.notificationService.send).toHaveBeenCalledTimes(2);
      expect(deps.notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-2', title: 'Evento annullato' }),
      );
      expect(deps.notificationService.send).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-3', title: 'Evento annullato' }),
      );
    });
  });

  describe('WALK_COMPLETED', () => {
    it('triggers gamification for walk completion', async () => {
      const deps = buildDeps();
      registerDomainEventHandlers(deps);

      await emit({
        type: DOMAIN_EVENT.WALK_COMPLETED,
        payload: { trackId: 't-1', userId: 'user-1', distanceKm: 2.5, durationMinutes: 30 },
        timestamp: new Date(),
      });

      expect(deps.awardXp).toHaveBeenCalledWith('user-1', 'walk_tracked');
      expect(deps.checkAndUnlockAchievements).toHaveBeenCalledWith('user-1');
    });
  });
});
