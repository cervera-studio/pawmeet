// Gamification domain: XP, badges, challenges, achievements, leaderboard

import { createAwardXp } from '../use-cases/award-xp.js';
import { createCheckAndAwardBadges } from '../use-cases/check-and-award-badges.js';
import { createCheckAndUnlockAchievements } from '../use-cases/check-and-unlock-achievements.js';
import { createCreateWeeklyChallenges } from '../use-cases/create-weekly-challenges.js';
import { createGetLeaderboard } from '../use-cases/get-leaderboard.js';
import { createGetStreak } from '../use-cases/get-streak.js';
import { createGetXpSummary } from '../use-cases/get-xp-summary.js';
import { createListAchievements } from '../use-cases/list-achievements.js';
import { createListActiveChallenges } from '../use-cases/list-active-challenges.js';
import { createListBadges } from '../use-cases/list-badges.js';
import { createUpdateChallengeProgress } from '../use-cases/update-challenge-progress.js';
import { createUpdateStreak } from '../use-cases/update-streak.js';
import { badgeRepo, gamificationRepo, walkRepo } from './services.js';

export const awardXp = createAwardXp({ gamificationRepo });

export const gamificationDeps = {
  awardXp,
  getXpSummary: createGetXpSummary({ gamificationRepo }),
  getLeaderboard: createGetLeaderboard({ gamificationRepo }),
  listActiveChallenges: createListActiveChallenges({ gamificationRepo }),
  updateChallengeProgress: createUpdateChallengeProgress({ gamificationRepo, awardXp }),
  checkAndUnlockAchievements: createCheckAndUnlockAchievements({ gamificationRepo }),
  listAchievements: createListAchievements({ gamificationRepo }),
  createWeeklyChallenges: createCreateWeeklyChallenges({ gamificationRepo }),
  updateStreak: createUpdateStreak({ gamificationRepo }),
  getStreak: createGetStreak({ gamificationRepo }),
};

export const badgeDeps = {
  listBadges: createListBadges({ badgeRepo }),
  checkAndAwardBadges: createCheckAndAwardBadges({ badgeRepo, walkRepo }),
};
