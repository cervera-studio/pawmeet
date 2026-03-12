import { createApiClient } from '@pawmeet/api-client';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-store';
import { createRestAuthRepository } from './rest/rest-auth-repository';
import { createRestPhotoModerationRepository } from './rest/rest-photo-moderation-repository';
import { createRestUserRepository } from './rest/rest-user-repository';
import { createTrpcContentModerationRepository } from './trpc/trpc-content-moderation-repository';
import { createTrpcDogRepository } from './trpc/trpc-dog-repository';
import { createTrpcFeedAdminRepository } from './trpc/trpc-feed-admin-repository';
import { createTrpcReportRepository } from './trpc/trpc-report-repository';
import { createTrpcSettingsRepository } from './trpc/trpc-settings-repository';
import { createTrpcStatsRepository } from './trpc/trpc-stats-repository';
import { createTrpcStoryAdminRepository } from './trpc/trpc-story-admin-repository';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const trpcClient = createApiClient(baseUrl, () => getAccessToken());

// Auth uses same-origin proxy (Next.js API routes → Fly.io API)
export const authRepository = createRestAuthRepository();
export const userRepository = createRestUserRepository(api);
export const photoModerationRepository = createRestPhotoModerationRepository(api);

// tRPC implementations
export const statsRepository = createTrpcStatsRepository(trpcClient);
export const dogRepository = createTrpcDogRepository(trpcClient);
export const reportRepository = createTrpcReportRepository(trpcClient);
export const contentModerationRepository = createTrpcContentModerationRepository(trpcClient);
export const settingsRepository = createTrpcSettingsRepository(trpcClient);
export const feedAdminRepository = createTrpcFeedAdminRepository(trpcClient);
export const storyAdminRepository = createTrpcStoryAdminRepository(trpcClient);
