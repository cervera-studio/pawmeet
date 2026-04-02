import { MAX_IMAGE_SIZE, MAX_STORIES_PER_DAY, MAX_VIDEO_SIZE } from '@pawmeet/config';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { StorageService, StoryRepository } from '../ports/index.js';

type Deps = {
  storyRepo: StoryRepository;
  storage: StorageService;
};

export function createCreateStory({ storyRepo, storage }: Deps) {
  return async (
    userId: string,
    contentType: string,
    fileSize: number,
  ): Promise<Result<{ uploadUrl: string; key: string }>> => {
    const todayCount = await storyRepo.countTodayByAuthor(userId);
    if (todayCount >= MAX_STORIES_PER_DAY) {
      return fail(
        new AppError(
          'STORY_LIMIT_REACHED',
          ERROR_MESSAGES.STORY_LIMIT_REACHED(MAX_STORIES_PER_DAY),
          400,
        ),
      );
    }

    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize > maxSize) {
      return fail(new AppError('FILE_TOO_LARGE', ERROR_MESSAGES.FILE_TOO_LARGE, 400));
    }

    const key = storage.buildStoryMediaKey(userId, contentType);
    const uploadUrl = await storage.generatePresignedUploadUrl(key, contentType);

    return succeed({ uploadUrl, key });
  };
}
