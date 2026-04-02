import type { ApiClient } from '@pawmeet/api-client';
import type { DogRepository } from '../interfaces';

export function createTrpcDogRepository(api: ApiClient): DogRepository {
  return {
    async create(data) {
      return api.dogs.create.mutate(data);
    },
    async generateBio(input) {
      return api.dogs.generateBio.mutate(input);
    },
    async analyzePhoto(input) {
      return api.dogs.analyzePhoto.mutate(input);
    },
  };
}
