import type { Redis } from '@upstash/redis';
import { createCache } from '../lib/cache.js';
import type { Breed, BreedRepository } from '../ports/breed-repository.js';

export class CachedBreedRepository implements BreedRepository {
  private readonly cache;

  constructor(
    private readonly inner: BreedRepository,
    redis: Redis,
  ) {
    this.cache = createCache<Breed>(redis, { prefix: 'cache:breed', ttlSeconds: 3600 });
  }

  search(query?: string): Promise<Breed[]> {
    // Only cache the full breed list (no query). Filtered searches go to DB.
    if (query) return this.inner.search(query);
    return this.cache.getList('all', () => this.inner.search());
  }
}
