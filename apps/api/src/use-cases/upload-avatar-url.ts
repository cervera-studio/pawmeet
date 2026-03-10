import type { Result } from '@dogwalk/types';
import { succeed } from '@dogwalk/types';
import type { StorageService } from '../ports/index.js';

type Deps = {
  storage: StorageService;
};

export function createUploadAvatarUrl({ storage }: Deps) {
  return async (
    userId: string,
    contentType: string,
  ): Promise<Result<{ uploadUrl: string; key: string }>> => {
    const { uploadUrl, key } = await storage.generateAvatarUploadUrl(userId, contentType);

    return succeed({ uploadUrl, key });
  };
}
