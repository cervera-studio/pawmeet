import {
  BEHAVIOR_WITH_DOGS,
  BEHAVIOR_WITH_PEOPLE,
  DOG_SIZE,
  ENERGY_LEVEL,
  GENDER,
  LEASH_BEHAVIOR,
  WALK_TERRAIN,
  WALK_TIME,
} from '@pawmeet/config';
import { describe, expect, it, vi } from 'vitest';
import type { BioGenerationService } from '../ports/bio-generation-service.js';
import { createGenerateDogBio } from './generate-dog-bio.js';

function buildInput() {
  return {
    name: 'Luna',
    breed: 'Labrador',
    size: DOG_SIZE.LARGE,
    gender: GENDER.FEMALE,
    energyLevel: ENERGY_LEVEL.HIGH,
    behaviorWithDogs: BEHAVIOR_WITH_DOGS.VERY_FRIENDLY,
    behaviorWithPeople: BEHAVIOR_WITH_PEOPLE.FRIENDLY,
    leashBehavior: LEASH_BEHAVIOR.GOOD,
    walkPrefTime: [WALK_TIME.MORNING, WALK_TIME.EVENING],
    walkPrefTerrain: [WALK_TERRAIN.PARK],
  };
}

function mockBioService(bio: string): BioGenerationService {
  return { generate: vi.fn().mockResolvedValue(bio) };
}

describe('generateDogBio', () => {
  it('returns generated bio from service', async () => {
    const bio = 'Ciao, sono Luna! Adoro correre al parco e fare amicizia con tutti.';
    const generateDogBio = createGenerateDogBio({ bioGenerationService: mockBioService(bio) });

    const result = await generateDogBio(buildInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe(bio);
    }
  });

  it('passes input to service', async () => {
    const service = mockBioService('Bio generata.');
    const generateDogBio = createGenerateDogBio({ bioGenerationService: service });
    const input = buildInput();

    await generateDogBio(input);

    expect(service.generate).toHaveBeenCalledWith(input);
  });

  it('degrades gracefully when service is not configured', async () => {
    const generateDogBio = createGenerateDogBio({ bioGenerationService: undefined });

    const result = await generateDogBio(buildInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio).toBe('');
    }
  });

  it('fails when service returns empty string', async () => {
    const generateDogBio = createGenerateDogBio({ bioGenerationService: mockBioService('') });

    const result = await generateDogBio(buildInput());

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe('AI_GENERATION_FAILED');
    }
  });

  it('truncates bio to 500 characters', async () => {
    const longBio = 'A'.repeat(600);
    const generateDogBio = createGenerateDogBio({ bioGenerationService: mockBioService(longBio) });

    const result = await generateDogBio(buildInput());

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.bio.length).toBe(500);
    }
  });
});
