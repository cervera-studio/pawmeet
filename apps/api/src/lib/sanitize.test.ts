import { describe, expect, it } from 'vitest';
import { sanitizeContent, sanitizeUser } from './sanitize.js';

describe('sanitize', () => {
  describe('sanitizeUser', () => {
    it('removes passwordHash and pushToken from user object', () => {
      const user = {
        id: 'u1',
        email: 'test@example.com',
        displayName: 'Test',
        passwordHash: '$2b$10$secret',
        authProvider: 'email' as const,
        avatarUrl: null,
        latitude: null,
        longitude: null,
        locationUpdatedAt: null,
        searchRadiusKm: 5,
        emailVerified: true,
        locale: 'it-IT',
        pushToken: 'ExponentPushToken[xxx]',
        notificationPrefs: { matches: true, messages: true, walks: true, marketing: false },
        isActive: true,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        dateOfBirth: new Date('1990-01-01'),
        deletionRequestedAt: null,
        deletionScheduledFor: null,
        totpSecret: null,
        mfaEnabled: false,
      };

      const safe = sanitizeUser(user);

      expect(safe).not.toHaveProperty('passwordHash');
      expect(safe).not.toHaveProperty('pushToken');
      expect(safe.id).toBe('u1');
      expect(safe.email).toBe('test@example.com');
    });
  });

  describe('sanitizeContent', () => {
    it('passes through clean text unchanged', () => {
      expect(sanitizeContent('Hello world')).toBe('Hello world');
    });

    it('strips HTML tags', () => {
      expect(sanitizeContent('<script>alert("xss")</script>')).toBe('alert("xss")');
    });

    it('strips self-closing tags', () => {
      expect(sanitizeContent('Hello <img src=x /> world')).toBe('Hello world');
    });

    it('removes javascript: URI scheme', () => {
      expect(sanitizeContent('javascript:alert(1)')).toBe('alert(1)');
    });

    it('removes vbscript: URI scheme', () => {
      expect(sanitizeContent('vbscript:msgbox')).toBe('msgbox');
    });

    it('removes data: URI scheme', () => {
      expect(sanitizeContent('data:text/html,<h1>hi</h1>')).toBe('text/html,hi');
    });

    it('removes event handlers', () => {
      expect(sanitizeContent('text onerror=alert(1) more')).toBe('text alert(1) more');
    });

    it('strips HTML comments', () => {
      expect(sanitizeContent('before<!-- comment -->after')).toBe('beforeafter');
    });

    it('strips CDATA sections', () => {
      expect(sanitizeContent('before<![CDATA[content]]>after')).toBe('beforeafter');
    });

    it('removes null bytes and control characters', () => {
      expect(sanitizeContent('hello\x00world\x01!')).toBe('helloworld!');
    });

    it('preserves newlines and tabs', () => {
      expect(sanitizeContent('line1\nline2\ttab')).toBe('line1\nline2\ttab');
    });

    it('decodes HTML entities before stripping', () => {
      expect(sanitizeContent('&lt;script&gt;')).toBe('');
    });

    it('handles triple-encoded entities', () => {
      const input = '&amp;amp;lt;script&amp;amp;gt;';
      const result = sanitizeContent(input);
      expect(result).not.toContain('<script>');
    });

    it('collapses excessive whitespace', () => {
      expect(sanitizeContent('hello     world')).toBe('hello world');
    });

    it('trims result', () => {
      expect(sanitizeContent('  hello  ')).toBe('hello');
    });
  });
});
