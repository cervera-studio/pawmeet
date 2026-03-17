import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import type { GenerateDogBioInput } from '@pawmeet/validation';
import type { BioGenerationService } from '../ports/bio-generation-service.js';

type Deps = {
  bioGenerationService?: BioGenerationService;
};

export function createGenerateDogBio({ bioGenerationService }: Deps) {
  return async (input: GenerateDogBioInput): Promise<Result<{ bio: string }>> => {
    if (!bioGenerationService) {
      return fail(new AppError('AI_SERVICE_UNAVAILABLE', 'Servizio AI non disponibile', 503));
    }

    const bio = await bioGenerationService.generate(input);

    if (!bio) {
      return fail(new AppError('AI_GENERATION_FAILED', 'Generazione bio fallita', 500));
    }

    return succeed({ bio: bio.slice(0, 500) });
  };
}
