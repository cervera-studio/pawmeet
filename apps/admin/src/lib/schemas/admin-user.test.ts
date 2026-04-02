import { createAdminUserSchema } from './admin-user';

function mockT(key: string, params?: Record<string, unknown>): string {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
}

const t = Object.assign(mockT, { has: () => true }) as unknown as Parameters<
  typeof createAdminUserSchema
>[0];

const schema = createAdminUserSchema(t);

function buildValidInput() {
  return {
    email: 'admin@pawmeet.io',
    displayName: 'John Admin',
    temporaryPassword: 'SecureP@ss1',
    role: 'admin' as const,
  };
}

describe('createAdminUserSchema', () => {
  it('accepts valid input', () => {
    const result = schema.safeParse(buildValidInput());
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = schema.safeParse({ ...buildValidInput(), email: 'not-email' });
    expect(result.success).toBe(false);
  });

  it('rejects empty displayName', () => {
    const result = schema.safeParse({ ...buildValidInput(), displayName: '' });
    expect(result.success).toBe(false);
  });

  it('rejects empty temporaryPassword', () => {
    const result = schema.safeParse({ ...buildValidInput(), temporaryPassword: '' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid roles', () => {
    for (const role of ['super_admin', 'admin', 'moderator', 'viewer'] as const) {
      const result = schema.safeParse({ ...buildValidInput(), role });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid role', () => {
    const result = schema.safeParse({ ...buildValidInput(), role: 'owner' });
    expect(result.success).toBe(false);
  });
});
