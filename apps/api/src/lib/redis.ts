import { Redis } from '@upstash/redis';

const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
if (!UPSTASH_REDIS_REST_URL) throw new Error('UPSTASH_REDIS_REST_URL is required');

const UPSTASH_REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
if (!UPSTASH_REDIS_REST_TOKEN) throw new Error('UPSTASH_REDIS_REST_TOKEN is required');

export const redis = new Redis({
  url: UPSTASH_REDIS_REST_URL,
  token: UPSTASH_REDIS_REST_TOKEN,
});
