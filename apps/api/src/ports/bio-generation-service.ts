import type { GenerateDogBioInput } from '@pawmeet/validation';

export interface BioGenerationService {
  generate(input: GenerateDogBioInput): Promise<string>;
}
