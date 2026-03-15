// Match domain: discovery, likes, passes, AI matching

import { createDiscoverCandidates } from '../use-cases/discover-candidates.js';
import { createDiscoverCandidatesAi } from '../use-cases/discover-candidates-ai.js';
import { createGetMatchExplanation } from '../use-cases/get-match-explanation.js';
import { createGetMatchingInsights } from '../use-cases/get-matching-insights.js';
import { createGetOptimalTimes } from '../use-cases/get-optimal-times.js';
import { createLearnUserPreferences } from '../use-cases/learn-user-preferences.js';
import { createLikeDog } from '../use-cases/like-dog.js';
import { createListMatches } from '../use-cases/list-matches.js';
import { createLogSwipeScores } from '../use-cases/log-swipe-scores.js';
import { createPassDog } from '../use-cases/pass-dog.js';
import { createRecordActivityWindow } from '../use-cases/record-activity-window.js';
import { createRecordMatchInteraction } from '../use-cases/record-match-interaction.js';
import { createUnmatch } from '../use-cases/unmatch.js';
import {
  dogRepo,
  experimentService,
  followRepo,
  matchRepo,
  matchingAiRepo,
  messageRepo,
  notificationService,
  userRepo,
} from './services.js';

export const matchDeps = {
  listMatches: createListMatches({ dogRepo, matchRepo, userRepo }),
  discoverCandidates: createDiscoverCandidates({ dogRepo, matchRepo, userRepo, followRepo }),
  likeDog: createLikeDog({ dogRepo, matchRepo, userRepo, notificationService }),
  passDog: createPassDog({ dogRepo, matchRepo }),
  unmatch: createUnmatch({ dogRepo, matchRepo, messageRepo }),
};

export const matchingAiDeps = {
  logSwipeScores: createLogSwipeScores({ matchingAiRepo }),
  recordMatchInteraction: createRecordMatchInteraction({ matchingAiRepo, matchRepo }),
  recordActivityWindow: createRecordActivityWindow({ matchingAiRepo }),
  learnUserPreferences: createLearnUserPreferences({ matchingAiRepo, matchRepo, dogRepo }),
  getOptimalTimes: createGetOptimalTimes({ matchingAiRepo, dogRepo }),
  getMatchingInsights: createGetMatchingInsights({
    matchingAiRepo,
    matchRepo,
    dogRepo,
    experimentService,
  }),
  discoverCandidatesAi: createDiscoverCandidatesAi({
    dogRepo,
    matchRepo,
    userRepo,
    matchingAiRepo,
    experimentService,
  }),
  getMatchExplanation: createGetMatchExplanation({ matchRepo, dogRepo, userRepo }),
};
