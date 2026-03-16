import type { DogProfile } from '@pawmeet/types';

/** Port for dog profile → vector encoding. */
export interface EmbeddingService {
  readonly modelVersion: string;
  encode(dog: DogProfile): number[];
}
