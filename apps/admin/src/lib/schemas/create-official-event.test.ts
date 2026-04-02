import { createOfficialEventFormSchema } from './create-official-event';

// Mock translation function that returns the key as-is
function mockT(key: string, params?: Record<string, unknown>): string {
  if (params) {
    return `${key}:${JSON.stringify(params)}`;
  }
  return key;
}

const t = Object.assign(mockT, { has: () => true }) as unknown as Parameters<
  typeof createOfficialEventFormSchema
>[0];

const schema = createOfficialEventFormSchema(t);

function buildValidInput() {
  return {
    title: 'Dog Walk Milan',
    description: 'A fun walk in the park',
    scheduledAt: '2026-06-01T10:00:00Z',
    durationMin: 60,
    location: 'Parco Sempione, Milano',
    latitude: 45.4722,
    longitude: 9.1725,
    maxParticipants: 20,
    organizationId: 'org-123',
    category: 'walk' as const,
  };
}

describe('createOfficialEventFormSchema', () => {
  it('accepts valid input', () => {
    const result = schema.safeParse(buildValidInput());
    expect(result.success).toBe(true);
  });

  it('rejects title shorter than 3 chars', () => {
    const result = schema.safeParse({ ...buildValidInput(), title: 'ab' });
    expect(result.success).toBe(false);
  });

  it('rejects title longer than 100 chars', () => {
    const result = schema.safeParse({ ...buildValidInput(), title: 'a'.repeat(101) });
    expect(result.success).toBe(false);
  });

  it('rejects empty scheduledAt', () => {
    const result = schema.safeParse({ ...buildValidInput(), scheduledAt: '' });
    expect(result.success).toBe(false);
  });

  it('rejects durationMin below 15', () => {
    const result = schema.safeParse({ ...buildValidInput(), durationMin: 10 });
    expect(result.success).toBe(false);
  });

  it('rejects durationMin above 180', () => {
    const result = schema.safeParse({ ...buildValidInput(), durationMin: 200 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer durationMin', () => {
    const result = schema.safeParse({ ...buildValidInput(), durationMin: 30.5 });
    expect(result.success).toBe(false);
  });

  it('rejects latitude outside range', () => {
    const result = schema.safeParse({ ...buildValidInput(), latitude: 91 });
    expect(result.success).toBe(false);
  });

  it('rejects longitude outside range', () => {
    const result = schema.safeParse({ ...buildValidInput(), longitude: -181 });
    expect(result.success).toBe(false);
  });

  it('rejects maxParticipants below 2', () => {
    const result = schema.safeParse({ ...buildValidInput(), maxParticipants: 1 });
    expect(result.success).toBe(false);
  });

  it('rejects maxParticipants above 500', () => {
    const result = schema.safeParse({ ...buildValidInput(), maxParticipants: 501 });
    expect(result.success).toBe(false);
  });

  it('rejects invalid category', () => {
    const result = schema.safeParse({ ...buildValidInput(), category: 'party' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid categories', () => {
    for (const category of ['walk', 'meetup', 'training'] as const) {
      const result = schema.safeParse({ ...buildValidInput(), category });
      expect(result.success).toBe(true);
    }
  });

  it('rejects empty organizationId', () => {
    const result = schema.safeParse({ ...buildValidInput(), organizationId: '' });
    expect(result.success).toBe(false);
  });
});
