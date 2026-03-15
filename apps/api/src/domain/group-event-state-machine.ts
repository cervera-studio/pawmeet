import { TRPCError } from '@trpc/server';
import type { GroupEventStatus } from '@pawmeet/types';
import { GROUP_EVENT_STATUS } from '@pawmeet/types';

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

export function assertTransition(from: GroupEventStatus, to: GroupEventStatus): void {
  if (!canTransitionTo(from, to)) {
    throw new TRPCError({
      code: 'PRECONDITION_FAILED',
      message: `Cannot transition event from "${from}" to "${to}"`,
    });
  }
}

export function getValidTransitions(from: GroupEventStatus): readonly GroupEventStatus[] {
  return VALID_TRANSITIONS[from];
}
