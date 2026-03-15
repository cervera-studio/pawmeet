// Group event domain: create, join, leave, cancel, sponsors, recurring

import { createAddEventSponsor } from '../use-cases/add-event-sponsor.js';
import { createApproveParticipant } from '../use-cases/approve-participant.js';
import { createAwardMainEventBadge } from '../use-cases/award-main-event-badge.js';
import { createCancelGroupEvent } from '../use-cases/cancel-group-event.js';
import { createCancelRequest } from '../use-cases/cancel-request.js';
import { createCreateGroupEvent } from '../use-cases/create-group-event.js';
import { createCreateOfficialEvent } from '../use-cases/create-official-event.js';
import { createCreateRecurringEvent } from '../use-cases/create-recurring-event.js';
import { createDeclineParticipant } from '../use-cases/decline-participant.js';
import { createGetEventRecap } from '../use-cases/get-event-recap.js';
import { createGetGroupEvent } from '../use-cases/get-group-event.js';
import { createInviteToEvent } from '../use-cases/invite-to-event.js';
import { createJoinGroupEvent } from '../use-cases/join-group-event.js';
import { createLeaveGroupEvent } from '../use-cases/leave-group-event.js';
import { createListEventSponsors } from '../use-cases/list-event-sponsors.js';
import { createListFeaturedEvents } from '../use-cases/list-featured-events.js';
import { createListNearbyEvents } from '../use-cases/list-nearby-events.js';
import { createListOccurrences } from '../use-cases/list-occurrences.js';
import { createListPendingRequests } from '../use-cases/list-pending-requests.js';
import { createListUserEvents } from '../use-cases/list-user-events.js';
import { createRemoveEventSponsor } from '../use-cases/remove-event-sponsor.js';
import { createRequestJoinEvent } from '../use-cases/request-join-event.js';
import { createUpdateGroupEvent } from '../use-cases/update-group-event.js';
import {
  badgeRepo,
  dogRepo,
  eventSponsorRepo,
  followRepo,
  groupEventRepo,
  notificationService,
  organizationRepo,
  userRepo,
} from './services.js';

export const groupEventDeps = {
  createGroupEvent: createCreateGroupEvent({ groupEventRepo, dogRepo }),
  getGroupEvent: createGetGroupEvent({ groupEventRepo }),
  listNearbyEvents: createListNearbyEvents({ groupEventRepo, followRepo }),
  listUserEvents: createListUserEvents({ groupEventRepo }),
  joinGroupEvent: createJoinGroupEvent({
    groupEventRepo,
    dogRepo,
    followRepo,
    notificationService,
  }),
  leaveGroupEvent: createLeaveGroupEvent({ groupEventRepo, notificationService }),
  updateGroupEvent: createUpdateGroupEvent({ groupEventRepo }),
  cancelGroupEvent: createCancelGroupEvent({ groupEventRepo, notificationService }),
  requestJoinEvent: createRequestJoinEvent({
    groupEventRepo,
    dogRepo,
    followRepo,
    notificationService,
  }),
  approveParticipant: createApproveParticipant({ groupEventRepo, notificationService }),
  declineParticipant: createDeclineParticipant({ groupEventRepo, notificationService }),
  cancelRequest: createCancelRequest({ groupEventRepo }),
  listPendingRequests: createListPendingRequests({ groupEventRepo }),
  createRecurringEvent: createCreateRecurringEvent({ groupEventRepo, dogRepo }),
  listOccurrences: createListOccurrences({ groupEventRepo }),
  createOfficialEvent: createCreateOfficialEvent({ organizationRepo, groupEventRepo, dogRepo }),
  listFeaturedEvents: createListFeaturedEvents({ groupEventRepo }),
  listEventSponsors: createListEventSponsors({ eventSponsorRepo }),
  getEventRecap: createGetEventRecap({ groupEventRepo, userRepo }),
  inviteToEvent: createInviteToEvent({ groupEventRepo, userRepo, dogRepo, notificationService }),
};

export const eventSponsorDeps = {
  addEventSponsor: createAddEventSponsor({ eventSponsorRepo, groupEventRepo, organizationRepo }),
  removeEventSponsor: createRemoveEventSponsor({ eventSponsorRepo }),
  listEventSponsors: createListEventSponsors({ eventSponsorRepo }),
  awardMainEventBadge: createAwardMainEventBadge({ badgeRepo, groupEventRepo }),
};
