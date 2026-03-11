import { MAX_DOGS_PER_USER } from '@dogwalk/config';
import { isFailure, isSuccess } from '@dogwalk/types';
import { describe, expect, it, vi } from 'vitest';
import { buildDog, buildDogInput, buildDogRepo } from '../test-utils/builders.js';
import { createCreateDog } from './create-dog.js';

describe('createCreateDog', () => {
  it('creates a dog profile successfully', async () => {
    const dogRepo = buildDogRepo({
      countByOwner: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockResolvedValue(buildDog({ name: 'Fido' })),
    });
    const createDog = createCreateDog({ dogRepo });

    const result = await createDog('usr_1', buildDogInput());

    expect(isSuccess(result)).toBe(true);
    if (!isSuccess(result)) return;
    expect(result.data.dog.name).toBe('Fido');
    expect(dogRepo.create).toHaveBeenCalledOnce();
  });

  it('fails with 400 when max dogs limit reached', async () => {
    const dogRepo = buildDogRepo({
      countByOwner: vi.fn().mockResolvedValue(MAX_DOGS_PER_USER),
    });
    const createDog = createCreateDog({ dogRepo });

    const result = await createDog('usr_1', buildDogInput());

    expect(isFailure(result)).toBe(true);
    if (!isFailure(result)) return;
    expect(result.error.code).toBe('DOG_LIMIT_REACHED');
    expect(result.error.status).toBe(400);
    expect(dogRepo.create).not.toHaveBeenCalled();
  });
});
