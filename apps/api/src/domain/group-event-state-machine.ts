import type { GroupEventStatus } from '@pawmeet/types';
import { AppError, GROUP_EVENT_STATUS } from '@pawmeet/types';

const VALID_TRANSITIONS: Record<GroupEventStatus, readonly GroupEventStatus[]> = {
  [GROUP_EVENT_STATUS.SCHEDULED]: [GROUP_EVENT_STATUS.IN_PROGRESS, GROUP_EVENT_STATUS.CANCELLED],
  [GROUP_EVENT_STATUS.IN_PROGRESS]: [GROUP_EVENT_STATUS.COMPLETED],
  [GROUP_EVENT_STATUS.COMPLETED]: [],
  [GROUP_EVENT_STATUS.CANCELLED]: [],
  [GROUP_EVENT_STATUS.TEMPLATE]: [],
};

export function canTransitionTo(from: GroupEventStatus, to: GroupEventStatus): boolean {
  return VALID_TRANSITIONS[from].includes(to);
}

export function checkTransition(from: GroupEventStatus, to: GroupEventStatus): AppError | null {
  if (!canTransitionTo(from, to)) {
    return new AppError(
      'INVALID_STATUS_TRANSITION',
      `Cannot transition event from "${from}" to "${to}"`,
      409,
    );
  }
  return null;
}

export function getValidTransitions(from: GroupEventStatus): readonly GroupEventStatus[] {
  return VALID_TRANSITIONS[from];
}
