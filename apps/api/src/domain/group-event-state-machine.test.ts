import { AppError } from '@pawmeet/types';
import { describe, expect, it } from 'vitest';
import { canTransitionTo, checkTransition, getValidTransitions } from './group-event-state-machine.js';

describe('group-event-state-machine', () => {
  describe('canTransitionTo', () => {
    it('allows scheduled → in_progress', () => {
      expect(canTransitionTo('scheduled', 'in_progress')).toBe(true);
    });

    it('allows scheduled → cancelled', () => {
      expect(canTransitionTo('scheduled', 'cancelled')).toBe(true);
    });

    it('allows in_progress → completed', () => {
      expect(canTransitionTo('in_progress', 'completed')).toBe(true);
    });

    it('rejects in_progress → cancelled', () => {
      expect(canTransitionTo('in_progress', 'cancelled')).toBe(false);
    });

    it('rejects all transitions from completed (terminal)', () => {
      expect(canTransitionTo('completed', 'scheduled')).toBe(false);
      expect(canTransitionTo('completed', 'in_progress')).toBe(false);
      expect(canTransitionTo('completed', 'cancelled')).toBe(false);
      expect(canTransitionTo('completed', 'template')).toBe(false);
    });

    it('rejects all transitions from cancelled (terminal)', () => {
      expect(canTransitionTo('cancelled', 'scheduled')).toBe(false);
      expect(canTransitionTo('cancelled', 'in_progress')).toBe(false);
      expect(canTransitionTo('cancelled', 'completed')).toBe(false);
      expect(canTransitionTo('cancelled', 'template')).toBe(false);
    });

    it('rejects all transitions from template', () => {
      expect(canTransitionTo('template', 'scheduled')).toBe(false);
      expect(canTransitionTo('template', 'in_progress')).toBe(false);
      expect(canTransitionTo('template', 'completed')).toBe(false);
      expect(canTransitionTo('template', 'cancelled')).toBe(false);
    });
  });

  describe('checkTransition', () => {
    it('returns null for valid transitions', () => {
      expect(checkTransition('scheduled', 'in_progress')).toBeNull();
      expect(checkTransition('scheduled', 'cancelled')).toBeNull();
      expect(checkTransition('in_progress', 'completed')).toBeNull();
    });

    it('returns AppError for invalid transitions', () => {
      const error = checkTransition('in_progress', 'cancelled');
      expect(error).toBeInstanceOf(AppError);
      expect(error?.code).toBe('INVALID_STATUS_TRANSITION');

      const error2 = checkTransition('completed', 'cancelled');
      expect(error2).toBeInstanceOf(AppError);
      expect(error2?.message).toContain('completed');
      expect(error2?.message).toContain('cancelled');
    });
  });

  describe('getValidTransitions', () => {
    it('returns valid targets for scheduled', () => {
      expect(getValidTransitions('scheduled')).toEqual(['in_progress', 'cancelled']);
    });

    it('returns valid targets for in_progress', () => {
      expect(getValidTransitions('in_progress')).toEqual(['completed']);
    });

    it('returns empty array for terminal states', () => {
      expect(getValidTransitions('completed')).toEqual([]);
      expect(getValidTransitions('cancelled')).toEqual([]);
      expect(getValidTransitions('template')).toEqual([]);
    });
  });
});
