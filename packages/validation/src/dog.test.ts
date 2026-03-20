import {
  behaviorWithDogsEnum,
  behaviorWithPeopleEnum,
  createDogSchema,
  dogSizeEnum,
  energyLevelEnum,
  genderEnum,
  leashBehaviorEnum,
  updateDogSchema,
  walkTerrainEnum,
  walkTimeEnum,
} from './dog';

// -- Builder --

function buildCreateDogInput(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    name: 'Fido',
    birthDate: '2022-06-15',
    breed: 'Labrador',
    size: 'large',
    weightKg: 30,
    gender: 'male',
    isNeutered: true,
    energyLevel: 'high',
    behaviorWithDogs: 'friendly',
    behaviorWithPeople: 'very_friendly',
    leashBehavior: 'good',
    walkPrefTime: ['morning'],
    walkPrefDurationMin: 30,
    walkPrefDurationMax: 60,
    walkPrefTerrain: ['park'],
    ...overrides,
  };
}

// -- Enum schemas --

describe('dogSizeEnum', () => {
  it.each(['toy', 'small', 'medium', 'large', 'giant'])('accepts "%s"', (value) => {
    expect(dogSizeEnum.safeParse(value).success).toBe(true);
  });

  it('rejects an invalid value', () => {
    expect(dogSizeEnum.safeParse('enorme').success).toBe(false);
  });
});

describe('energyLevelEnum', () => {
  it.each(['low', 'medium', 'high', 'very_high'])('accepts "%s"', (value) => {
    expect(energyLevelEnum.safeParse(value).success).toBe(true);
  });

  it('rejects an invalid value', () => {
    expect(energyLevelEnum.safeParse('estrema').success).toBe(false);
  });
});

describe('behaviorWithDogsEnum', () => {
  it.each(['very_friendly', 'friendly', 'selective', 'reactive'])('accepts "%s"', (value) => {
    expect(behaviorWithDogsEnum.safeParse(value).success).toBe(true);
  });
});

describe('behaviorWithPeopleEnum', () => {
  it.each(['very_friendly', 'friendly', 'shy', 'wary'])('accepts "%s"', (value) => {
    expect(behaviorWithPeopleEnum.safeParse(value).success).toBe(true);
  });
});

describe('leashBehaviorEnum', () => {
  it.each(['excellent', 'good', 'in_training', 'difficult'])('accepts "%s"', (value) => {
    expect(leashBehaviorEnum.safeParse(value).success).toBe(true);
  });
});

describe('walkTimeEnum', () => {
  it.each([
    'early_morning',
    'morning',
    'afternoon',
    'evening',
    'late_evening',
  ])('accepts "%s"', (value) => {
    expect(walkTimeEnum.safeParse(value).success).toBe(true);
  });
});

describe('walkTerrainEnum', () => {
  it.each(['urban', 'park', 'countryside', 'beach', 'mountain'])('accepts "%s"', (value) => {
    expect(walkTerrainEnum.safeParse(value).success).toBe(true);
  });
});

describe('genderEnum', () => {
  it.each(['male', 'female'])('accepts "%s"', (value) => {
    expect(genderEnum.safeParse(value).success).toBe(true);
  });
});

// -- createDogSchema --

describe('createDogSchema', () => {
  it('accepts a fully valid input', () => {
    const result = createDogSchema.safeParse(buildCreateDogInput());
    expect(result.success).toBe(true);
  });

  it('accepts optional fields when provided', () => {
    const result = createDogSchema.safeParse(
      buildCreateDogInput({
        breedSecondary: 'Golden Retriever',
        recallReliability: 'reliable',
        bio: 'A friendly dog who loves parks.',
      }),
    );
    expect(result.success).toBe(true);
  });

  // -- name --

  it('rejects a name shorter than 2 characters', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ name: 'F' })).success).toBe(false);
  });

  it('rejects a name longer than 50 characters', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ name: 'F'.repeat(51) })).success).toBe(
      false,
    );
  });

  // -- birthDate (coerce) --

  it('coerces a valid date string into a Date', () => {
    const result = createDogSchema.safeParse(buildCreateDogInput({ birthDate: '2023-01-01' }));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.birthDate).toBeInstanceOf(Date);
    }
  });

  it('rejects an invalid date string', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ birthDate: 'not-a-date' })).success,
    ).toBe(false);
  });

  // -- breed --

  it('rejects an empty breed', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ breed: '' })).success).toBe(false);
  });

  it('rejects a breed longer than 100 characters', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ breed: 'A'.repeat(101) })).success).toBe(
      false,
    );
  });

  // -- breedSecondary --

  it('accepts undefined breedSecondary', () => {
    const { breedSecondary: _, ...input } = buildCreateDogInput() as Record<string, unknown>;
    expect(createDogSchema.safeParse(input).success).toBe(true);
  });

  it('rejects breedSecondary longer than 100 characters', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ breedSecondary: 'B'.repeat(101) })).success,
    ).toBe(false);
  });

  // -- weightKg --

  it('rejects weightKg below 0.5', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ weightKg: 0.4 })).success).toBe(false);
  });

  it('rejects weightKg above 100', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ weightKg: 101 })).success).toBe(false);
  });

  it('accepts boundary weights (0.5 and 100)', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ weightKg: 0.5 })).success).toBe(true);
    expect(createDogSchema.safeParse(buildCreateDogInput({ weightKg: 100 })).success).toBe(true);
  });

  // -- size enum --

  it('rejects an invalid size', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ size: 'enorme' })).success).toBe(false);
  });

  // -- gender enum --

  it('rejects an invalid gender', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ gender: 'altro' })).success).toBe(false);
  });

  // -- isNeutered --

  it('rejects a non-boolean isNeutered', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ isNeutered: 'yes' })).success).toBe(
      false,
    );
  });

  // -- recallReliability --

  it.each(['reliable', 'partial', 'unreliable'])('accepts recallReliability "%s"', (value) => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ recallReliability: value })).success,
    ).toBe(true);
  });

  it('rejects an invalid recallReliability', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ recallReliability: 'ottimo' })).success,
    ).toBe(false);
  });

  // -- bio --

  it('rejects a bio longer than 500 characters', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ bio: 'x'.repeat(501) })).success).toBe(
      false,
    );
  });

  // -- walkPrefTime --

  it('rejects an empty walkPrefTime array', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ walkPrefTime: [] })).success).toBe(
      false,
    );
  });

  it('accepts multiple walkPrefTime values', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ walkPrefTime: ['morning', 'evening'] }))
        .success,
    ).toBe(true);
  });

  // -- walkPrefDurationMin / walkPrefDurationMax --

  it('rejects walkPrefDurationMin below 15', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ walkPrefDurationMin: 14 })).success,
    ).toBe(false);
  });

  it('rejects walkPrefDurationMax above 180', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ walkPrefDurationMax: 181 })).success,
    ).toBe(false);
  });

  it('accepts boundary duration values (15 and 180)', () => {
    expect(
      createDogSchema.safeParse(
        buildCreateDogInput({ walkPrefDurationMin: 15, walkPrefDurationMax: 180 }),
      ).success,
    ).toBe(true);
  });

  // -- walkPrefTerrain --

  it('rejects an empty walkPrefTerrain array', () => {
    expect(createDogSchema.safeParse(buildCreateDogInput({ walkPrefTerrain: [] })).success).toBe(
      false,
    );
  });

  it('rejects an invalid terrain value', () => {
    expect(
      createDogSchema.safeParse(buildCreateDogInput({ walkPrefTerrain: ['bosco'] })).success,
    ).toBe(false);
  });
});

// -- updateDogSchema (partial) --

describe('updateDogSchema', () => {
  it('accepts an empty object (all fields optional)', () => {
    const result = updateDogSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts a single valid field', () => {
    const result = updateDogSchema.safeParse({ name: 'Rex' });
    expect(result.success).toBe(true);
  });

  it('still validates field constraints', () => {
    expect(updateDogSchema.safeParse({ name: 'X' }).success).toBe(false);
    expect(updateDogSchema.safeParse({ weightKg: -1 }).success).toBe(false);
  });

  it('accepts multiple valid fields together', () => {
    const result = updateDogSchema.safeParse({
      name: 'Bella',
      size: 'small',
      weightKg: 5,
    });
    expect(result.success).toBe(true);
  });
});
