import type { User } from '@pawmeet/types';
import type { Redis } from '@upstash/redis';
import { createCache } from '../lib/cache.js';
import type {
  CreateUserInput,
  NearbyQuery,
  NearbyUser,
  SearchResult,
  UserRepository,
} from '../ports/user-repository.js';

export class CachedUserRepository implements UserRepository {
  private readonly cache;

  constructor(
    private readonly inner: UserRepository,
    redis: Redis,
  ) {
    this.cache = createCache<User>(redis, { prefix: 'cache:user', ttlSeconds: 300 });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.inner.findByEmail(email);
  }

  findByIdWithPassword(id: string): Promise<User | null> {
    // Never cache password-bearing records
    return this.inner.findByIdWithPassword(id);
  }

  findById(id: string): Promise<User | null> {
    return this.cache.get(id, () => this.inner.findById(id));
  }

  async findByIds(ids: string[]): Promise<User[]> {
    // No cache for batch — pass through
    return this.inner.findByIds(ids);
  }

  async create(input: CreateUserInput): Promise<User> {
    return this.inner.create(input);
  }

  async update(id: string, data: Parameters<UserRepository['update']>[1]): Promise<User> {
    const result = await this.inner.update(id, data);
    await this.cache.invalidate(id);
    return result;
  }

  async updatePushToken(userId: string, token: string | null): Promise<void> {
    await this.inner.updatePushToken(userId, token);
    await this.cache.invalidate(userId);
  }

  findPushToken(userId: string): Promise<string | null> {
    return this.inner.findPushToken(userId);
  }

  findNearby(query: NearbyQuery): Promise<NearbyUser[]> {
    return this.inner.findNearby(query);
  }

  searchByName(
    query: string,
    excludeUserId: string,
    limit: number,
    offset: number,
  ): Promise<SearchResult[]> {
    return this.inner.searchByName(query, excludeUserId, limit, offset);
  }
}
