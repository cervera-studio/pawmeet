import type { GroupEvent, GroupEventParticipant, GroupEventStatus } from '@pawmeet/types';
import { GROUP_EVENT_STATUS, GROUP_EVENT_VISIBILITY } from '@pawmeet/types';
import { canTransitionTo, getValidTransitions } from './group-event-state-machine.js';

/**
 * GroupEvent aggregate root — encapsulates business rules for event lifecycle.
 * Pure domain logic, no side effects. Use cases orchestrate persistence and notifications.
 */
export interface GroupEventAggregate {
  readonly event: GroupEvent;

  /** Whether the event is still open for new participants. */
  isJoinable(): boolean;

  /** Whether the event has started or is past its scheduled time. */
  isPast(): boolean;

  /** Whether the event is at capacity. */
  isFull(currentCount: number): boolean;

  /** Determine participant status based on event settings. */
  resolveJoinStatus(): 'accepted' | 'pending';

  /** Whether a given user can join (friends-only check not included — requires async). */
  canTransitionTo(status: GroupEventStatus): boolean;

  /** Get valid next statuses from current state. */
  validTransitions(): readonly GroupEventStatus[];

  /** Whether visibility restricts to friends only. */
  isFriendsOnly(): boolean;

  /** Whether the participant is blocked from joining (already active). */
  isAlreadyActive(participant: GroupEventParticipant | null): boolean;
}

export function createGroupEventAggregate(event: GroupEvent): GroupEventAggregate {
  return {
    event,

    isJoinable() {
      return event.status === GROUP_EVENT_STATUS.SCHEDULED && event.scheduledAt > new Date();
    },

    isPast() {
      return event.scheduledAt <= new Date();
    },

    isFull(currentCount: number) {
      return currentCount >= event.maxParticipants;
    },

    resolveJoinStatus() {
      return event.requiresApproval ? 'pending' : 'accepted';
    },

    canTransitionTo(status: GroupEventStatus) {
      return canTransitionTo(event.status, status);
    },

    validTransitions() {
      return getValidTransitions(event.status);
    },

    isFriendsOnly() {
      return event.visibility === GROUP_EVENT_VISIBILITY.FRIENDS_ONLY;
    },

    isAlreadyActive(participant: GroupEventParticipant | null) {
      if (!participant) return false;
      return participant.status !== 'declined' && participant.status !== 'cancelled';
    },
  };
}
