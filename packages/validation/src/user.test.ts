import { updateUserProfileSchema } from './user';

// -- Builder --

function buildUpdateUserProfileInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    displayName: 'Mario Rossi',
    avatarUrl: 'https://example.com/avatar.jpg',
    latitude: 41.9028,
    longitude: 12.4964,
    searchRadiusKm: 10,
    ...overrides,
  };
}

describe('updateUserProfileSchema', () => {
  it('accepts a fully valid input', () => {
    const result = updateUserProfileSchema.safeParse(buildUpdateUserProfileInput());
    expect(result.success).toBe(true);
  });

  it('accepts an empty object (all fields optional)', () => {
    const result = updateUserProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  // -- displayName --

  it('rejects displayName shorter than 2 characters', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ displayName: 'A' })).success,
    ).toBe(false);
  });

  it('rejects displayName longer than 50 characters', () => {
    expect(
      updateUserProfileSchema.safeParse(
        buildUpdateUserProfileInput({ displayName: 'A'.repeat(51) }),
      ).success,
    ).toBe(false);
  });

  it('accepts boundary displayName lengths (2 and 50)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ displayName: 'AB' })).success,
    ).toBe(true);
    expect(
      updateUserProfileSchema.safeParse(
        buildUpdateUserProfileInput({ displayName: 'A'.repeat(50) }),
      ).success,
    ).toBe(true);
  });

  // -- avatarUrl --

  it('accepts a valid URL for avatarUrl', () => {
    const result = updateUserProfileSchema.safeParse(
      buildUpdateUserProfileInput({ avatarUrl: 'https://cdn.example.com/photo.png' }),
    );
    expect(result.success).toBe(true);
  });

  it('rejects an invalid URL for avatarUrl', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ avatarUrl: 'not-a-url' }))
        .success,
    ).toBe(false);
  });

  it('accepts null for avatarUrl (nullable)', () => {
    const result = updateUserProfileSchema.safeParse(
      buildUpdateUserProfileInput({ avatarUrl: null }),
    );
    expect(result.success).toBe(true);
  });

  it('accepts undefined for avatarUrl (optional)', () => {
    const { avatarUrl: _, ...input } = buildUpdateUserProfileInput() as Record<string, unknown>;
    expect(updateUserProfileSchema.safeParse(input).success).toBe(true);
  });

  // -- latitude --

  it('rejects latitude below -90', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ latitude: -91 })).success,
    ).toBe(false);
  });

  it('rejects latitude above 90', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ latitude: 91 })).success,
    ).toBe(false);
  });

  it('accepts boundary latitudes (-90 and 90)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ latitude: -90 })).success,
    ).toBe(true);
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ latitude: 90 })).success,
    ).toBe(true);
  });

  it('accepts null for latitude (nullable)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ latitude: null })).success,
    ).toBe(true);
  });

  // -- longitude --

  it('rejects longitude below -180', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ longitude: -181 })).success,
    ).toBe(false);
  });

  it('rejects longitude above 180', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ longitude: 181 })).success,
    ).toBe(false);
  });

  it('accepts boundary longitudes (-180 and 180)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ longitude: -180 })).success,
    ).toBe(true);
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ longitude: 180 })).success,
    ).toBe(true);
  });

  it('accepts null for longitude (nullable)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ longitude: null })).success,
    ).toBe(true);
  });

  // -- searchRadiusKm --

  it('rejects searchRadiusKm below 1', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ searchRadiusKm: 0 })).success,
    ).toBe(false);
  });

  it('rejects searchRadiusKm above 50', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ searchRadiusKm: 51 }))
        .success,
    ).toBe(false);
  });

  it('accepts boundary searchRadiusKm values (1 and 50)', () => {
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ searchRadiusKm: 1 })).success,
    ).toBe(true);
    expect(
      updateUserProfileSchema.safeParse(buildUpdateUserProfileInput({ searchRadiusKm: 50 }))
        .success,
    ).toBe(true);
  });
});
