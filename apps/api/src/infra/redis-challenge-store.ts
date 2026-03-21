import { WEBAUTHN_CHALLENGE_TTL_SECONDS } from '@pawmeet/config';
import type { ChallengeStore } from '../use-cases/passkey-register-options.js';

interface RedisLike {
  set(key: string, value: string, opts?: { ex?: number }): Promise<unknown>;
  get<T = string>(key: string): Promise<T | null>;
  del(key: string): Promise<unknown>;
}

export class RedisChallengeStore implements ChallengeStore {
  private readonly prefix = 'webauthn:challenge:';

  constructor(private readonly redis: RedisLike) {}

  async set(key: string, challenge: string): Promise<void> {
    await this.redis.set(`${this.prefix}${key}`, challenge, {
      ex: WEBAUTHN_CHALLENGE_TTL_SECONDS,
    });
  }

  async get(key: string): Promise<string | null> {
    return this.redis.get(`${this.prefix}${key}`);
  }

  async del(key: string): Promise<void> {
    await this.redis.del(`${this.prefix}${key}`);
  }
}
