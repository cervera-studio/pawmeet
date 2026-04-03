import type { DogProfile } from '@pawmeet/types';
import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { sanitizeContent } from '../lib/sanitize.js';
import type { CreateDogInput, DogRepository } from '../ports/index.js';

type Deps = {
  dogRepo: DogRepository;
};

export function createUpdateDog({ dogRepo }: Deps) {
  return async (
    dogId: string,
    userId: string,
    input: Partial<CreateDogInput>,
  ): Promise<Result<{ dog: DogProfile }>> => {
    const existing = await dogRepo.findByIdAndOwner(dogId, userId);
    if (!existing) {
      return fail(new AppError('DOG_NOT_FOUND', 'Dog profile not found', 404));
    }

    const sanitizedInput = { ...input, bio: input.bio ? sanitizeContent(input.bio) : input.bio };
    const dog = await dogRepo.update(dogId, sanitizedInput);
    return succeed({ dog });
  };
}
