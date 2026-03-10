import { describe, expect, it } from 'vitest';
import {
  type EmailJobData,
  getRedisConnection,
  type NotificationJobData,
  type PhotoModerationJobData,
  QUEUE_NAMES,
} from './queue.js';

// We only test pure functions and types — actual queue creation requires Redis

describe('Job queue utilities', () => {
  describe('QUEUE_NAMES', () => {
    it('defines all expected queue names', () => {
      expect(QUEUE_NAMES.PHOTO_MODERATION).toBe('photo-moderation');
      expect(QUEUE_NAMES.NOTIFICATIONS).toBe('notifications');
      expect(QUEUE_NAMES.EMAIL).toBe('email');
    });
  });

  describe('getRedisConnection', () => {
    it('returns default connection config when env vars are not set', () => {
      const conn = getRedisConnection();
      expect(conn.host).toBe('localhost');
      expect(conn.port).toBe(6379);
      expect(conn.maxRetriesPerRequest).toBeNull();
    });
  });

  describe('Job data types', () => {
    it('PhotoModerationJobData has required fields', () => {
      const data: PhotoModerationJobData = {
        photoId: 'photo-1',
        dogId: 'dog-1',
        url: 'https://example.com/photo.jpg',
      };
      expect(data.photoId).toBe('photo-1');
      expect(data.dogId).toBe('dog-1');
      expect(data.url).toBe('https://example.com/photo.jpg');
    });

    it('NotificationJobData has required fields', () => {
      const data: NotificationJobData = {
        userId: 'user-1',
        title: 'Test',
        body: 'Test body',
      };
      expect(data.userId).toBe('user-1');
    });

    it('NotificationJobData accepts optional data', () => {
      const data: NotificationJobData = {
        userId: 'user-1',
        title: 'Test',
        body: 'Test body',
        data: { matchId: 'match-1' },
      };
      expect(data.data?.matchId).toBe('match-1');
    });

    it('EmailJobData has required fields', () => {
      const data: EmailJobData = {
        to: 'test@example.com',
        subject: 'Test',
        html: '<p>Hello</p>',
      };
      expect(data.to).toBe('test@example.com');
    });
  });
});
