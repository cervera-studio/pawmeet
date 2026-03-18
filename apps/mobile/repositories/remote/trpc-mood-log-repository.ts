import type { ApiClient } from '@pawmeet/api-client';
import type { MoodLogRepository } from '../interfaces';

export function createTrpcMoodLogRepository(api: ApiClient): MoodLogRepository {
  return {
    async submit(input) {
      return api.moodLogs.submit.mutate(input);
    },
    async listByDog(dogId, cursor, limit) {
      return api.moodLogs.listByDog.query({ dogId, cursor, limit });
    },
  };
}
