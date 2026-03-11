import { createApiClient } from '@dogwalk/api-client';
import { api } from '@/lib/api';
import { getAccessToken } from '@/lib/auth-store';
import { createRestAuthRepository } from './rest/rest-auth-repository';
import { createRestPhotoModerationRepository } from './rest/rest-photo-moderation-repository';
import { createRestUserRepository } from './rest/rest-user-repository';
import { createTrpcContentModerationRepository } from './trpc/trpc-content-moderation-repository';
import { createTrpcDogRepository } from './trpc/trpc-dog-repository';
import { createTrpcReportRepository } from './trpc/trpc-report-repository';
import { createTrpcSettingsRepository } from './trpc/trpc-settings-repository';
import { createTrpcStatsRepository } from './trpc/trpc-stats-repository';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const trpcClient = createApiClient(baseUrl, () => getAccessToken());

// REST implementations (pending migration to tRPC)
export const authRepository = createRestAuthRepository(api);
export const userRepository = createRestUserRepository(api);
export const photoModerationRepository = createRestPhotoModerationRepository(api);

// tRPC implementations
export const statsRepository = createTrpcStatsRepository(trpcClient);
export const dogRepository = createTrpcDogRepository(trpcClient);
export const reportRepository = createTrpcReportRepository(trpcClient);
export const contentModerationRepository = createTrpcContentModerationRepository(trpcClient);
export const settingsRepository = createTrpcSettingsRepository(trpcClient);
