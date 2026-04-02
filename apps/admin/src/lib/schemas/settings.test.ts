import {
  createGeneralSettingsSchema,
  createMatchingSettingsSchema,
  createModerationSettingsSchema,
} from './settings';

function mockT(key: string, params?: Record<string, unknown>): string {
  if (params) return `${key}:${JSON.stringify(params)}`;
  return key;
}

const t = Object.assign(mockT, { has: () => true }) as unknown as Parameters<
  typeof createGeneralSettingsSchema
>[0];

describe('createGeneralSettingsSchema', () => {
  const schema = createGeneralSettingsSchema(t);

  it('accepts valid input', () => {
    const result = schema.safeParse({ appName: 'PawMeet', supportEmail: 'support@pawmeet.io' });
    expect(result.success).toBe(true);
  });

  it('rejects empty appName', () => {
    const result = schema.safeParse({ appName: '', supportEmail: 'support@pawmeet.io' });
    expect(result.success).toBe(false);
  });

  it('rejects invalid email', () => {
    const result = schema.safeParse({ appName: 'PawMeet', supportEmail: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

describe('createModerationSettingsSchema', () => {
  const schema = createModerationSettingsSchema(t);

  it('accepts valid input', () => {
    const result = schema.safeParse({
      photoConfidenceThreshold: 80,
      maxReportsBeforeSuspension: 5,
    });
    expect(result.success).toBe(true);
  });

  it('rejects photoConfidenceThreshold below 0', () => {
    const result = schema.safeParse({
      photoConfidenceThreshold: -1,
      maxReportsBeforeSuspension: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects photoConfidenceThreshold above 100', () => {
    const result = schema.safeParse({
      photoConfidenceThreshold: 101,
      maxReportsBeforeSuspension: 5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer maxReportsBeforeSuspension', () => {
    const result = schema.safeParse({
      photoConfidenceThreshold: 80,
      maxReportsBeforeSuspension: 2.5,
    });
    expect(result.success).toBe(false);
  });

  it('rejects maxReportsBeforeSuspension below 1', () => {
    const result = schema.safeParse({
      photoConfidenceThreshold: 80,
      maxReportsBeforeSuspension: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe('createMatchingSettingsSchema', () => {
  const schema = createMatchingSettingsSchema(t);

  function buildValidWeights() {
    return {
      matchWeightSize: 0.25,
      matchWeightEnergy: 0.25,
      matchWeightBehavior: 0.2,
      matchWeightWalk: 0.15,
      matchWeightDistance: 0.1,
      matchWeightLeash: 0.05,
    };
  }

  it('accepts valid weights', () => {
    const result = schema.safeParse(buildValidWeights());
    expect(result.success).toBe(true);
  });

  it('accepts zero weights', () => {
    const result = schema.safeParse({
      matchWeightSize: 0,
      matchWeightEnergy: 0,
      matchWeightBehavior: 0,
      matchWeightWalk: 0,
      matchWeightDistance: 0,
      matchWeightLeash: 0,
    });
    expect(result.success).toBe(true);
  });

  it('accepts max weight of 1', () => {
    const result = schema.safeParse({
      matchWeightSize: 1,
      matchWeightEnergy: 1,
      matchWeightBehavior: 1,
      matchWeightWalk: 1,
      matchWeightDistance: 1,
      matchWeightLeash: 1,
    });
    expect(result.success).toBe(true);
  });

  it('rejects weight below 0', () => {
    const result = schema.safeParse({ ...buildValidWeights(), matchWeightSize: -0.1 });
    expect(result.success).toBe(false);
  });

  it('rejects weight above 1', () => {
    const result = schema.safeParse({ ...buildValidWeights(), matchWeightEnergy: 1.1 });
    expect(result.success).toBe(false);
  });
});
