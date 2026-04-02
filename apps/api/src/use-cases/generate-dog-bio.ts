import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GenerateDogBioInput } from '@pawmeet/validation';
import type { BioGenerationService } from '../ports/bio-generation-service.js';

type Deps = {
  bioGenerationService?: BioGenerationService;
};

export function createGenerateDogBio({ bioGenerationService }: Deps) {
  return async (input: GenerateDogBioInput): Promise<Result<{ bio: string }>> => {
    // Service not configured → graceful degradation (empty bio is acceptable).
    // Service configured but returns empty → unexpected failure (AI_GENERATION_FAILED).
    if (!bioGenerationService) {
      return succeed({ bio: '' });
    }

    const bio = await bioGenerationService.generate(input);

    if (!bio) {
      return fail(new AppError('AI_GENERATION_FAILED', 'Bio generation failed', 500));
    }

    return succeed({ bio: bio.slice(0, 500) });
  };
}
