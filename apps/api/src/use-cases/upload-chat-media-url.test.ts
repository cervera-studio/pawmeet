import { MAX_IMAGE_SIZE, MAX_VIDEO_SIZE } from '@pawmeet/config';
import { isFailure, isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildMessageRepo, buildStorageService } from '../test-utils/builders.js';
import { createUploadChatMediaUrl } from './upload-chat-media-url.js';

function buildDeps() {
  return {
    messageRepo: buildMessageRepo({
      isMatchParticipant: vi.fn().mockResolvedValue(true),
    }),
    storage: buildStorageService({
      buildChatMediaKey: vi.fn().mockReturnValue('chat/match-1/photo.jpg'),
      generatePresignedUploadUrl: vi.fn().mockResolvedValue('https://upload.example.com/presigned'),
    }),
  };
}

describe('createUploadChatMediaUrl', () => {
  it('generates presigned upload URL for image', async () => {
    const deps = buildDeps();
    const uploadUrl = createUploadChatMediaUrl(deps);

    const result = await uploadUrl('user-1', 'match-1', 'image/jpeg', 1024);

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.uploadUrl).toBe('https://upload.example.com/presigned');
    expect(result.data.key).toBe('chat/match-1/photo.jpg');
  });

  it('fails with 403 when not a participant', async () => {
    const deps = buildDeps();
    deps.messageRepo.isMatchParticipant = vi.fn().mockResolvedValue(false);
    const uploadUrl = createUploadChatMediaUrl(deps);

    const result = await uploadUrl('user-1', 'match-1', 'image/jpeg', 1024);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('NOT_PARTICIPANT');
    expect(result.error.status).toBe(403);
  });

  it('fails with 400 when image exceeds max size', async () => {
    const deps = buildDeps();
    const uploadUrl = createUploadChatMediaUrl(deps);

    const result = await uploadUrl('user-1', 'match-1', 'image/jpeg', MAX_IMAGE_SIZE + 1);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });

  it('fails with 400 when video exceeds max size', async () => {
    const deps = buildDeps();
    const uploadUrl = createUploadChatMediaUrl(deps);

    const result = await uploadUrl('user-1', 'match-1', 'video/mp4', MAX_VIDEO_SIZE + 1);

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('FILE_TOO_LARGE');
  });

  it('allows video within size limit', async () => {
    const deps = buildDeps();
    const uploadUrl = createUploadChatMediaUrl(deps);

    const result = await uploadUrl('user-1', 'match-1', 'video/mp4', MAX_VIDEO_SIZE - 1);

    expect(isSuccess(result)).toBe(true);
  });
});
