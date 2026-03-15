// Walk domain: propose, respond, cancel, list, feedback, fitness tracking

import { createAddTrackPoints } from '../use-cases/add-track-points.js';
import { createCancelWalk } from '../use-cases/cancel-walk.js';
import { createCreateWalkAlbum } from '../use-cases/create-walk-album.js';
import { createEndWalkTracking } from '../use-cases/end-walk-tracking.js';
import { createGetActivityStats } from '../use-cases/get-activity-stats.js';
import { createGetDogHealthGoal } from '../use-cases/get-dog-health-goal.js';
import { createGetDogRating } from '../use-cases/get-dog-rating.js';
import { createGetWalkAlbum } from '../use-cases/get-walk-album.js';
import { createGetWalkTrack } from '../use-cases/get-walk-track.js';
import { createGetUserTracks } from '../use-cases/get-user-tracks.js';
import { createListUpcomingWalks } from '../use-cases/list-upcoming-walks.js';
import { createListWalkFeedback } from '../use-cases/list-walk-feedback.js';
import { createListWalksByMatch } from '../use-cases/list-walks-by-match.js';
import { createProposeWalk } from '../use-cases/propose-walk.js';
import { createRespondToWalk } from '../use-cases/respond-to-walk.js';
import { createStartWalkTracking } from '../use-cases/start-walk-tracking.js';
import { createSubmitFeedback } from '../use-cases/submit-feedback.js';
import { createSyncHealthData } from '../use-cases/sync-health-data.js';
import { awardXp } from './gamification-container.js';
import {
  activityRepo,
  dogRepo,
  feedRepo,
  feedbackRepo,
  matchRepo,
  messageRepo,
  notificationService,
  userRepo,
  walkAlbumRepo,
  walkRepo,
  walkTrackRepo,
} from './services.js';

export const walkDeps = {
  proposeWalk: createProposeWalk({
    walkRepo,
    matchRepo,
    messageRepo,
    dogRepo,
    userRepo,
    notificationService,
  }),
  respondToWalk: createRespondToWalk({
    walkRepo,
    matchRepo,
    dogRepo,
    userRepo,
    notificationService,
  }),
  cancelWalk: createCancelWalk({ walkRepo, matchRepo, dogRepo, userRepo, notificationService }),
  listUpcomingWalks: createListUpcomingWalks({ walkRepo }),
  listWalksByMatch: createListWalksByMatch({ walkRepo, matchRepo, dogRepo }),
};

export const feedbackDeps = {
  submitFeedback: createSubmitFeedback({ feedbackRepo, walkRepo, matchRepo, dogRepo }),
  listWalkFeedback: createListWalkFeedback({ feedbackRepo }),
  getDogRating: createGetDogRating({ feedbackRepo }),
};

export const fitnessDeps = {
  startWalkTracking: createStartWalkTracking({ walkTrackRepo, walkRepo }),
  addTrackPoints: createAddTrackPoints({ walkTrackRepo }),
  endWalkTracking: createEndWalkTracking({ walkTrackRepo, awardXp }),
  getWalkTrack: createGetWalkTrack({ walkTrackRepo }),
  getUserTracks: createGetUserTracks({ walkTrackRepo }),
  syncHealthData: createSyncHealthData({ activityRepo }),
  getActivityStats: createGetActivityStats({ activityRepo }),
  getDogHealthGoal: createGetDogHealthGoal({ dogRepo, activityRepo }),
};

export const walkAlbumDeps = {
  createWalkAlbum: createCreateWalkAlbum({ walkAlbumRepo }),
};
