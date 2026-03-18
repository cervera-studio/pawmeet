import type { MoodLog } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { DogRepository, MoodLogRepository } from '../ports/index.js';

type Deps = {
  moodLogRepo: MoodLogRepository;
  dogRepo: DogRepository;
};

export function createListDogMoodLogs({ moodLogRepo, dogRepo }: Deps) {
  return async (
    userId: string,
    dogId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<Result<{ logs: MoodLog[]; nextCursor: string | null }>> => {
    const effectiveLimit = limit ?? 20;

    // Verify dog ownership
    const dog = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!dog) {
      return fail(new AppError('DOG_NOT_FOUND', 'Profilo cane non trovato', 404));
    }

    const result = await moodLogRepo.findByDog(dogId, cursor ?? null, effectiveLimit);
    return succeed(result);
  };
}
