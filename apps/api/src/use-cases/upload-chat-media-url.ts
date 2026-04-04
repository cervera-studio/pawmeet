import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@pawmeet/config';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { ERROR_MESSAGES } from '../constants/messages.js';
import type { MessageRepository, StorageService } from '../ports/index.js';

type Deps = {
  messageRepo: Pick<MessageRepository, 'isMatchParticipant'>;
  storage: StorageService;
};

export function createUploadChatMediaUrl({ messageRepo, storage }: Deps) {
  return async (
    userId: string,
    matchId: string,
    contentType: string,
    fileSize: number,
  ): Promise<Result<{ uploadUrl: string; key: string; publicUrl: string }>> => {
    const isParticipant = await messageRepo.isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return fail(
        new AppError('NOT_PARTICIPANT', ERROR_MESSAGES.NOT_PARTICIPANT_CONVERSATION, 403),
      );
    }

    const isVideo = contentType.startsWith('video/');
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    if (fileSize > maxSize) {
      return fail(new AppError('FILE_TOO_LARGE', ERROR_MESSAGES.FILE_TOO_LARGE, 400));
    }

    const key = storage.buildChatMediaKey(matchId, contentType);
    const uploadUrl = await storage.generatePresignedUploadUrl(key, contentType);
    const publicUrl = storage.getPublicUrl(key);

    return succeed({ uploadUrl, key, publicUrl });
  };
}
