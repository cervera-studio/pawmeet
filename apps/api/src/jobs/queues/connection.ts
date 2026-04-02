import process from 'node:process';
import type { DefaultJobOptions } from 'bullmq';
import { Queue } from 'bullmq';

/** BullMQ Redis connection config — uses standard Redis (not Upstash REST) */
export function getRedisConnection() {
  const enableTls =
    process.env.REDIS_TLS === 'true' ||
    (process.env.NODE_ENV === 'production' && process.env.REDIS_TLS !== 'false');
  return {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    ...(enableTls && { tls: {} }),
  };
}

/** DRY helper that eliminates the repeated lazy singleton pattern for queue creation. */
export function createLazyQueue(name: string, defaultJobOptions: DefaultJobOptions): () => Queue {
  let instance: Queue | null = null;
  return () => {
    if (!instance)
      instance = new Queue(name, { connection: getRedisConnection(), defaultJobOptions });
    return instance;
  };
}
