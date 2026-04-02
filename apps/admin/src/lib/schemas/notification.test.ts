import {
  createBroadcastNotificationSchema,
  createTargetedNotificationSchema,
} from './notification';

function mockT(key: string, params?: Record<string, unknown>): string {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
}

const t = Object.assign(mockT, { has: () => true }) as unknown as Parameters<
  typeof createBroadcastNotificationSchema
>[0];

describe('createBroadcastNotificationSchema', () => {
  const schema = createBroadcastNotificationSchema(t);

  it('accepts valid input', () => {
    const result = schema.safeParse({ title: 'New feature!', body: 'Check it out' });
    expect(result.success).toBe(true);
  });

  it('rejects empty title', () => {
    const result = schema.safeParse({ title: '', body: 'Check it out' });
    expect(result.success).toBe(false);
  });

  it('rejects title over 100 chars', () => {
    const result = schema.safeParse({ title: 'a'.repeat(101), body: 'Check it out' });
    expect(result.success).toBe(false);
  });

  it('rejects empty body', () => {
    const result = schema.safeParse({ title: 'Title', body: '' });
    expect(result.success).toBe(false);
  });

  it('rejects body over 500 chars', () => {
    const result = schema.safeParse({ title: 'Title', body: 'a'.repeat(501) });
    expect(result.success).toBe(false);
  });
});

describe('createTargetedNotificationSchema', () => {
  const schema = createTargetedNotificationSchema(t);

  it('accepts valid input', () => {
    const result = schema.safeParse({
      title: 'Hello',
      body: 'Message for you',
      userIdsText: 'user-1,user-2',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty userIdsText', () => {
    const result = schema.safeParse({
      title: 'Hello',
      body: 'Message',
      userIdsText: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects missing userIdsText', () => {
    const result = schema.safeParse({ title: 'Hello', body: 'Message' });
    expect(result.success).toBe(false);
  });
});
