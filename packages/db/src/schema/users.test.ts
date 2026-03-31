import { getTableColumns, getTableName } from 'drizzle-orm';
import { users } from './users';

describe('users table', () => {
  it('has the correct table name', () => {
    expect(getTableName(users)).toBe('users');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(users);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'email',
        'displayName',
        'authProvider',
        'passwordHash',
        'emailVerified',
        'avatarUrl',
        'latitude',
        'longitude',
        'locationUpdatedAt',
        'searchRadiusKm',
        'notificationPrefs',
        'isActive',
        'locale',
        'pushToken',
        'createdAt',
        'lastLoginAt',
        'deletionScheduledAt',
        'dateOfBirth',
        'followersCount',
        'followingCount',
        'termsAcceptedAt',
        'privacyPolicyVersion',
        'onboardingCompletedAt',
      ]),
    );
    expect(columnNames).toHaveLength(24);
  });

  describe('id column', () => {
    it('is a uuid primary key with random default', () => {
      const col = getTableColumns(users).id;
      expect(col.name).toBe('id');
      expect(col.dataType).toBe('string');
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('email column', () => {
    it('is a not-null unique varchar(255)', () => {
      const col = getTableColumns(users).email;
      expect(col.name).toBe('email');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.isUnique).toBe(true);
      expect(col.config.length).toBe(255);
    });
  });

  describe('displayName column', () => {
    it('is a not-null varchar(50)', () => {
      const col = getTableColumns(users).displayName;
      expect(col.name).toBe('display_name');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.config.length).toBe(50);
    });
  });

  describe('authProvider column', () => {
    it('is a not-null varchar(10) with email as default', () => {
      const col = getTableColumns(users).authProvider;
      expect(col.name).toBe('auth_provider');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe('email');
      expect(col.config.length).toBe(10);
    });
  });

  describe('avatarUrl column', () => {
    it('is a nullable text column', () => {
      const col = getTableColumns(users).avatarUrl;
      expect(col.name).toBe('avatar_url');
      expect(col.columnType).toBe('PgText');
      expect(col.notNull).toBe(false);
    });
  });

  describe('latitude column', () => {
    it('is a nullable double precision', () => {
      const col = getTableColumns(users).latitude;
      expect(col.name).toBe('latitude');
      expect(col.columnType).toBe('PgDoublePrecision');
      expect(col.notNull).toBe(false);
    });
  });

  describe('longitude column', () => {
    it('is a nullable double precision', () => {
      const col = getTableColumns(users).longitude;
      expect(col.name).toBe('longitude');
      expect(col.columnType).toBe('PgDoublePrecision');
      expect(col.notNull).toBe(false);
    });
  });

  describe('locationUpdatedAt column', () => {
    it('is a nullable timestamp with timezone', () => {
      const col = getTableColumns(users).locationUpdatedAt;
      expect(col.name).toBe('location_updated_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(false);
    });
  });

  describe('searchRadiusKm column', () => {
    it('is a not-null integer with default 10', () => {
      const col = getTableColumns(users).searchRadiusKm;
      expect(col.name).toBe('search_radius_km');
      expect(col.columnType).toBe('PgInteger');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(10);
    });
  });

  describe('isActive column', () => {
    it('is a not-null boolean with default true', () => {
      const col = getTableColumns(users).isActive;
      expect(col.name).toBe('is_active');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(true);
    });
  });

  describe('createdAt column', () => {
    it('is a not-null timestamp with timezone and defaultNow', () => {
      const col = getTableColumns(users).createdAt;
      expect(col.name).toBe('created_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('notificationPrefs column', () => {
    it('is a jsonb column with default prefs', () => {
      const col = getTableColumns(users).notificationPrefs;
      expect(col.name).toBe('notification_prefs');
      expect(col.columnType).toBe('PgJsonb');
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('lastLoginAt column', () => {
    it('is a nullable timestamp with timezone', () => {
      const col = getTableColumns(users).lastLoginAt;
      expect(col.name).toBe('last_login_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(false);
      expect(col.hasDefault).toBe(false);
    });
  });
});
