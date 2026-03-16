import type { GroupEventParticipant } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { buildGroupEvent } from '../test-utils/builders.js';
import { createGroupEventAggregate } from './group-event.js';

function futureDate(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000);
}

function pastDate(): Date {
  return new Date(Date.now() - 24 * 60 * 60 * 1000);
}

describe('GroupEventAggregate', () => {
  describe('isJoinable', () => {
    it('returns true for a scheduled future event', () => {
      const agg = createGroupEventAggregate(
        buildGroupEvent({ status: 'scheduled', scheduledAt: futureDate() }),
      );
      expect(agg.isJoinable()).toBe(true);
    });

    it('returns false for a past scheduled event', () => {
      const agg = createGroupEventAggregate(
        buildGroupEvent({ status: 'scheduled', scheduledAt: pastDate() }),
      );
      expect(agg.isJoinable()).toBe(false);
    });

    it('returns false for an in-progress event', () => {
      const agg = createGroupEventAggregate(
        buildGroupEvent({ status: 'in_progress', scheduledAt: pastDate() }),
      );
      expect(agg.isJoinable()).toBe(false);
    });

    it('returns false for a cancelled event', () => {
      const agg = createGroupEventAggregate(
        buildGroupEvent({ status: 'cancelled', scheduledAt: futureDate() }),
      );
      expect(agg.isJoinable()).toBe(false);
    });
  });

  describe('isFull', () => {
    it('returns true when at capacity', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ maxParticipants: 5 }));
      expect(agg.isFull(5)).toBe(true);
    });

    it('returns false when below capacity', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ maxParticipants: 10 }));
      expect(agg.isFull(3)).toBe(false);
    });
  });

  describe('resolveJoinStatus', () => {
    it('returns pending when approval required', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ requiresApproval: true }));
      expect(agg.resolveJoinStatus()).toBe('pending');
    });

    it('returns accepted when no approval needed', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ requiresApproval: false }));
      expect(agg.resolveJoinStatus()).toBe('accepted');
    });
  });

  describe('canTransitionTo', () => {
    it('allows scheduled → in_progress', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ status: 'scheduled' }));
      expect(agg.canTransitionTo('in_progress')).toBe(true);
    });

    it('rejects completed → scheduled', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ status: 'completed' }));
      expect(agg.canTransitionTo('scheduled')).toBe(false);
    });
  });

  describe('isFriendsOnly', () => {
    it('detects friends-only visibility', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ visibility: 'friends_only' }));
      expect(agg.isFriendsOnly()).toBe(true);
    });

    it('returns false for public events', () => {
      const agg = createGroupEventAggregate(buildGroupEvent({ visibility: 'public' }));
      expect(agg.isFriendsOnly()).toBe(false);
    });
  });

  describe('isAlreadyActive', () => {
    it('returns false for null participant', () => {
      const agg = createGroupEventAggregate(buildGroupEvent());
      expect(agg.isAlreadyActive(null)).toBe(false);
    });

    it('returns true for accepted participant', () => {
      const agg = createGroupEventAggregate(buildGroupEvent());
      expect(agg.isAlreadyActive({ status: 'accepted' } as GroupEventParticipant)).toBe(true);
    });

    it('returns false for declined participant', () => {
      const agg = createGroupEventAggregate(buildGroupEvent());
      expect(agg.isAlreadyActive({ status: 'declined' } as GroupEventParticipant)).toBe(false);
    });

    it('returns false for cancelled participant', () => {
      const agg = createGroupEventAggregate(buildGroupEvent());
      expect(agg.isAlreadyActive({ status: 'cancelled' } as GroupEventParticipant)).toBe(false);
    });
  });
});
