import type { XpAction } from '@dogwalk/config';
import { STORY_DURATION_HOURS } from '@dogwalk/config';
import type { Result, Story, XpSummary } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import type { StorageService, StoryRepository } from '../ports/index.js';

type AwardXpFn = (
  userId: string,
  action: XpAction,
  metadata?: Record<string, unknown>,
) => Promise<Result<{ xpAwarded: number; summary: XpSummary }>>;

type Deps = {
  storyRepo: StoryRepository;
  storage: StorageService;
  awardXp?: AwardXpFn;
};

export function createConfirmStory({ storyRepo, storage, awardXp }: Deps) {
  return async (
    userId: string,
    key: string,
    mediaType: string,
  ): Promise<Result<{ story: Story }>> => {
    if (!key.startsWith(`stories/${userId}/`)) {
      return fail(new AppError('INVALID_STORY_KEY', 'Chiave story non valida', 403));
    }

    const publicUrl = storage.getPublicUrl(key);
    const expiresAt = new Date(Date.now() + STORY_DURATION_HOURS * 60 * 60 * 1000);

    const story = await storyRepo.createStory({
      authorId: userId,
      mediaUrl: publicUrl,
      mediaType,
      thumbnailUrl: null,
      expiresAt,
    });

    if (awardXp) {
      await awardXp(userId, 'story_created', { storyId: story.id });
    }

    return succeed({ story });
  };
}
