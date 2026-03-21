import type { DogPhoto, DogProfile } from '@pawmeet/types';
import type { Redis } from '@upstash/redis';
import { createCache } from '../lib/cache.js';
import type { CreateDogInput, DogRepository } from '../ports/dog-repository.js';

export class CachedDogRepository implements DogRepository {
  private readonly cache;

  constructor(
    private readonly inner: DogRepository,
    redis: Redis,
  ) {
    this.cache = createCache<DogProfile>(redis, { prefix: 'cache:dog', ttlSeconds: 300 });
  }

  findById(id: string): Promise<DogProfile | null> {
    return this.cache.get(id, () => this.inner.findById(id));
  }

  findByIds(ids: string[]): Promise<DogProfile[]> {
    return this.inner.findByIds(ids);
  }

  findByOwner(ownerId: string, activeOnly?: boolean): Promise<DogProfile[]> {
    return this.inner.findByOwner(ownerId, activeOnly);
  }

  findByIdAndOwner(id: string, ownerId: string): Promise<DogProfile | null> {
    return this.inner.findByIdAndOwner(id, ownerId);
  }

  countByOwner(ownerId: string): Promise<number> {
    return this.inner.countByOwner(ownerId);
  }

  async create(input: CreateDogInput): Promise<DogProfile> {
    return this.inner.create(input);
  }

  async update(id: string, data: Partial<CreateDogInput>): Promise<DogProfile> {
    const result = await this.inner.update(id, data);
    await this.cache.invalidate(id);
    return result;
  }

  async softDelete(id: string): Promise<void> {
    await this.inner.softDelete(id);
    await this.cache.invalidate(id);
  }

  // Photos — pass through, no caching needed

  findPhotos(dogId: string): Promise<DogPhoto[]> {
    return this.inner.findPhotos(dogId);
  }

  countPhotos(dogId: string): Promise<number> {
    return this.inner.countPhotos(dogId);
  }

  addPhoto(input: {
    dogId: string;
    url: string;
    position: number;
    isPrimary: boolean;
  }): Promise<DogPhoto> {
    return this.inner.addPhoto(input);
  }

  findPhoto(photoId: string, dogId: string): Promise<DogPhoto | null> {
    return this.inner.findPhoto(photoId, dogId);
  }

  deletePhoto(photoId: string): Promise<void> {
    return this.inner.deletePhoto(photoId);
  }

  updatePhotoPositions(
    updates: { id: string; position: number; isPrimary: boolean }[],
  ): Promise<void> {
    return this.inner.updatePhotoPositions(updates);
  }

  findPhotoById(photoId: string): Promise<DogPhoto | null> {
    return this.inner.findPhotoById(photoId);
  }

  updatePhotoModerationStatus(photoId: string, status: 'approved' | 'rejected'): Promise<void> {
    return this.inner.updatePhotoModerationStatus(photoId, status);
  }
}
