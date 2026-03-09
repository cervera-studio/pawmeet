import { getTableColumns, getTableName } from 'drizzle-orm';
import { matches, swipes } from './matches';

describe('matches table', () => {
  it('has the correct table name', () => {
    expect(getTableName(matches)).toBe('matches');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(matches);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'dogAId',
        'dogBId',
        'compatibilityScore',
        'createdAt',
        'isActive',
      ]),
    );
    expect(columnNames).toHaveLength(6);
  });

  describe('id column', () => {
    it('is a uuid primary key', () => {
      const col = getTableColumns(matches).id;
      expect(col.name).toBe('id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('dogAId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(matches).dogAId;
      expect(col.name).toBe('dog_a_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('dogBId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(matches).dogBId;
      expect(col.name).toBe('dog_b_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('compatibilityScore column', () => {
    it('is a not-null double precision', () => {
      const col = getTableColumns(matches).compatibilityScore;
      expect(col.name).toBe('compatibility_score');
      expect(col.columnType).toBe('PgDoublePrecision');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(false);
    });
  });

  describe('createdAt column', () => {
    it('is a not-null timestamp with defaultNow', () => {
      const col = getTableColumns(matches).createdAt;
      expect(col.name).toBe('created_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('isActive column', () => {
    it('is a not-null boolean with default true', () => {
      const col = getTableColumns(matches).isActive;
      expect(col.name).toBe('is_active');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(true);
    });
  });
});

describe('swipes table', () => {
  it('has the correct table name', () => {
    expect(getTableName(swipes)).toBe('swipes');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(swipes);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining(['id', 'swiperDogId', 'swipedDogId', 'direction', 'createdAt']),
    );
    expect(columnNames).toHaveLength(5);
  });

  describe('id column', () => {
    it('is a uuid primary key', () => {
      const col = getTableColumns(swipes).id;
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('swiperDogId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(swipes).swiperDogId;
      expect(col.name).toBe('swiper_dog_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('swipedDogId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(swipes).swipedDogId;
      expect(col.name).toBe('swiped_dog_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('direction column', () => {
    it('is a not-null varchar(5)', () => {
      const col = getTableColumns(swipes).direction;
      expect(col.name).toBe('direction');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(5);
    });
  });

  describe('createdAt column', () => {
    it('is a not-null timestamp with defaultNow', () => {
      const col = getTableColumns(swipes).createdAt;
      expect(col.name).toBe('created_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });
});
