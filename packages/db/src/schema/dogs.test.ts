import { getTableColumns, getTableName } from 'drizzle-orm';
import { dogPhotos, dogProfiles } from './dogs';

describe('dogProfiles table', () => {
  it('has the correct table name', () => {
    expect(getTableName(dogProfiles)).toBe('dog_profiles');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(dogProfiles);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'ownerId',
        'name',
        'birthDate',
        'breed',
        'breedSecondary',
        'size',
        'weightKg',
        'gender',
        'isNeutered',
        'energyLevel',
        'behaviorWithDogs',
        'behaviorWithPeople',
        'leashBehavior',
        'recallReliability',
        'bio',
        'walkPrefTime',
        'walkPrefDurationMin',
        'walkPrefDurationMax',
        'walkPrefTerrain',
        'isActive',
        'createdAt',
        'updatedAt',
      ]),
    );
    expect(columnNames).toHaveLength(23);
  });

  describe('id column', () => {
    it('is a uuid primary key', () => {
      const col = getTableColumns(dogProfiles).id;
      expect(col.name).toBe('id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('ownerId column', () => {
    it('is a not-null uuid that references users.id', () => {
      const col = getTableColumns(dogProfiles).ownerId;
      expect(col.name).toBe('owner_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('name column', () => {
    it('is a not-null varchar(50)', () => {
      const col = getTableColumns(dogProfiles).name;
      expect(col.name).toBe('name');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(50);
    });
  });

  describe('birthDate column', () => {
    it('is a not-null timestamp with timezone', () => {
      const col = getTableColumns(dogProfiles).birthDate;
      expect(col.name).toBe('birth_date');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
    });
  });

  describe('breed columns', () => {
    it('has a not-null primary breed varchar(100)', () => {
      const col = getTableColumns(dogProfiles).breed;
      expect(col.name).toBe('breed');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(100);
    });

    it('has a nullable secondary breed varchar(100)', () => {
      const col = getTableColumns(dogProfiles).breedSecondary;
      expect(col.name).toBe('breed_secondary');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(false);
      expect(col.config.length).toBe(100);
    });
  });

  describe('size column', () => {
    it('is a not-null varchar(10)', () => {
      const col = getTableColumns(dogProfiles).size;
      expect(col.name).toBe('size');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(10);
    });
  });

  describe('weightKg column', () => {
    it('is a not-null double precision', () => {
      const col = getTableColumns(dogProfiles).weightKg;
      expect(col.name).toBe('weight_kg');
      expect(col.columnType).toBe('PgDoublePrecision');
      expect(col.notNull).toBe(true);
    });
  });

  describe('gender column', () => {
    it('is a not-null varchar(10)', () => {
      const col = getTableColumns(dogProfiles).gender;
      expect(col.name).toBe('gender');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(10);
    });
  });

  describe('isNeutered column', () => {
    it('is a not-null boolean without default', () => {
      const col = getTableColumns(dogProfiles).isNeutered;
      expect(col.name).toBe('is_neutered');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(false);
    });
  });

  describe('behavior columns', () => {
    it('has energyLevel as not-null varchar(15)', () => {
      const col = getTableColumns(dogProfiles).energyLevel;
      expect(col.name).toBe('energy_level');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(15);
    });

    it('has behaviorWithDogs as not-null varchar(20)', () => {
      const col = getTableColumns(dogProfiles).behaviorWithDogs;
      expect(col.name).toBe('behavior_with_dogs');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(20);
    });

    it('has behaviorWithPeople as not-null varchar(20)', () => {
      const col = getTableColumns(dogProfiles).behaviorWithPeople;
      expect(col.name).toBe('behavior_with_people');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(20);
    });

    it('has leashBehavior as not-null varchar(20)', () => {
      const col = getTableColumns(dogProfiles).leashBehavior;
      expect(col.name).toBe('leash_behavior');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(20);
    });

    it('has recallReliability as nullable varchar(20)', () => {
      const col = getTableColumns(dogProfiles).recallReliability;
      expect(col.name).toBe('recall_reliability');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(false);
      expect(col.config.length).toBe(20);
    });
  });

  describe('bio column', () => {
    it('is a nullable text', () => {
      const col = getTableColumns(dogProfiles).bio;
      expect(col.name).toBe('bio');
      expect(col.columnType).toBe('PgText');
      expect(col.notNull).toBe(false);
    });
  });

  describe('walk preference columns', () => {
    it('has walkPrefTime as not-null jsonb', () => {
      const col = getTableColumns(dogProfiles).walkPrefTime;
      expect(col.name).toBe('walk_pref_time');
      expect(col.columnType).toBe('PgJsonb');
      expect(col.notNull).toBe(true);
    });

    it('has walkPrefDurationMin as not-null integer', () => {
      const col = getTableColumns(dogProfiles).walkPrefDurationMin;
      expect(col.name).toBe('walk_pref_duration_min');
      expect(col.columnType).toBe('PgInteger');
      expect(col.notNull).toBe(true);
    });

    it('has walkPrefDurationMax as not-null integer', () => {
      const col = getTableColumns(dogProfiles).walkPrefDurationMax;
      expect(col.name).toBe('walk_pref_duration_max');
      expect(col.columnType).toBe('PgInteger');
      expect(col.notNull).toBe(true);
    });

    it('has walkPrefTerrain as not-null jsonb', () => {
      const col = getTableColumns(dogProfiles).walkPrefTerrain;
      expect(col.name).toBe('walk_pref_terrain');
      expect(col.columnType).toBe('PgJsonb');
      expect(col.notNull).toBe(true);
    });
  });

  describe('isActive column', () => {
    it('is a not-null boolean with default true', () => {
      const col = getTableColumns(dogProfiles).isActive;
      expect(col.name).toBe('is_active');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(true);
    });
  });

  describe('timestamp columns', () => {
    it('has createdAt as not-null timestamp with defaultNow', () => {
      const col = getTableColumns(dogProfiles).createdAt;
      expect(col.name).toBe('created_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });

    it('has updatedAt as not-null timestamp with defaultNow', () => {
      const col = getTableColumns(dogProfiles).updatedAt;
      expect(col.name).toBe('updated_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });
});

describe('dogPhotos table', () => {
  it('has the correct table name', () => {
    expect(getTableName(dogPhotos)).toBe('dog_photos');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(dogPhotos);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'dogId',
        'url',
        'position',
        'isPrimary',
        'moderationStatus',
        'uploadedAt',
      ]),
    );
    expect(columnNames).toHaveLength(7);
  });

  describe('id column', () => {
    it('is a uuid primary key', () => {
      const col = getTableColumns(dogPhotos).id;
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('dogId column', () => {
    it('is a not-null uuid that references dogProfiles', () => {
      const col = getTableColumns(dogPhotos).dogId;
      expect(col.name).toBe('dog_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('url column', () => {
    it('is a not-null text', () => {
      const col = getTableColumns(dogPhotos).url;
      expect(col.name).toBe('url');
      expect(col.columnType).toBe('PgText');
      expect(col.notNull).toBe(true);
    });
  });

  describe('position column', () => {
    it('is a not-null integer', () => {
      const col = getTableColumns(dogPhotos).position;
      expect(col.name).toBe('position');
      expect(col.columnType).toBe('PgInteger');
      expect(col.notNull).toBe(true);
    });
  });

  describe('isPrimary column', () => {
    it('is a not-null boolean with default false', () => {
      const col = getTableColumns(dogPhotos).isPrimary;
      expect(col.name).toBe('is_primary');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(false);
    });
  });

  describe('moderationStatus column', () => {
    it('is a not-null varchar(10) with default pending', () => {
      const col = getTableColumns(dogPhotos).moderationStatus;
      expect(col.name).toBe('moderation_status');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe('pending');
      expect(col.config.length).toBe(10);
    });
  });

  describe('uploadedAt column', () => {
    it('is a not-null timestamp with defaultNow', () => {
      const col = getTableColumns(dogPhotos).uploadedAt;
      expect(col.name).toBe('uploaded_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });
});
