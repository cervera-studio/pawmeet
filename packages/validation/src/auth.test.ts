import { loginSchema, registerSchema } from './auth';

// -- Builders --

function buildRegisterInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    email: 'user@example.com',
    password: 'SecureP4ss',
    displayName: 'Mario Rossi',
    ...overrides,
  };
}

function buildLoginInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    email: 'user@example.com',
    password: 'secret',
    ...overrides,
  };
}

// -- registerSchema --

describe('registerSchema', () => {
  it('accepts a valid registration input', () => {
    const result = registerSchema.safeParse(buildRegisterInput());
    expect(result.success).toBe(true);
  });

  // -- email --

  it('rejects missing email', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ email: undefined }));
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ email: 'not-an-email' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Email non valida');
    }
  });

  // -- password --

  it('rejects a password shorter than 8 characters', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ password: 'Ab1' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Minimo 8 caratteri');
    }
  });

  it('rejects a password without an uppercase letter', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ password: 'alllower1' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Almeno una maiuscola');
    }
  });

  it('rejects a password without a digit', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ password: 'NoDigitsHere' }));
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message);
      expect(messages).toContain('Almeno un numero');
    }
  });

  it('accepts a password that meets all requirements', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ password: 'GoodPass1' }));
    expect(result.success).toBe(true);
  });

  // -- displayName --

  it('rejects a displayName shorter than 2 characters', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ displayName: 'A' }));
    expect(result.success).toBe(false);
  });

  it('rejects a displayName longer than 50 characters', () => {
    const result = registerSchema.safeParse(buildRegisterInput({ displayName: 'A'.repeat(51) }));
    expect(result.success).toBe(false);
  });

  it('accepts boundary displayName lengths (2 and 50)', () => {
    expect(registerSchema.safeParse(buildRegisterInput({ displayName: 'AB' })).success).toBe(true);
    expect(
      registerSchema.safeParse(buildRegisterInput({ displayName: 'A'.repeat(50) })).success,
    ).toBe(true);
  });
});

// -- loginSchema --

describe('loginSchema', () => {
  it('accepts a valid login input', () => {
    const result = loginSchema.safeParse(buildLoginInput());
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = loginSchema.safeParse(buildLoginInput({ email: 'bad' }));
    expect(result.success).toBe(false);
  });

  it('rejects an empty password', () => {
    const result = loginSchema.safeParse(buildLoginInput({ password: '' }));
    expect(result.success).toBe(false);
  });

  it('accepts any non-empty password', () => {
    const result = loginSchema.safeParse(buildLoginInput({ password: 'x' }));
    expect(result.success).toBe(true);
  });
});
