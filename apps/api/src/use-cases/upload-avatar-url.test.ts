import { isSuccess } from '@pawmeet/types';
import { describe, expect, it, vi } from 'vitest';
import { buildStorageService } from '../test-utils/builders.js';
import { createUploadAvatarUrl } from './upload-avatar-url.js';

describe('createUploadAvatarUrl', () => {
  it('returns a presigned upload URL and key', async () => {
    const storage = buildStorageService({
      generateAvatarUploadUrl: vi.fn().mockResolvedValue({
        uploadUrl: 'https://r2.example.com/upload',
        key: 'avatars/user-1.jpg',
      }),
    });
    const execute = createUploadAvatarUrl({ storage });

    const result = await execute('user-1', 'image/jpeg');

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.uploadUrl).toBe('https://r2.example.com/upload');
    expect(result.data.key).toBe('avatars/user-1.jpg');
    expect(storage.generateAvatarUploadUrl).toHaveBeenCalledWith('user-1', 'image/jpeg');
  });
});
