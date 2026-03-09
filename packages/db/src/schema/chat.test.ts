import { getTableColumns, getTableName } from 'drizzle-orm';
import { messages } from './chat';

describe('messages table', () => {
  it('has the correct table name', () => {
    expect(getTableName(messages)).toBe('messages');
  });

  it('has all expected columns', () => {
    const columns = getTableColumns(messages);
    const columnNames = Object.keys(columns);

    expect(columnNames).toEqual(
      expect.arrayContaining([
        'id',
        'matchId',
        'senderId',
        'content',
        'mediaUrl',
        'status',
        'isDeleted',
        'createdAt',
      ]),
    );
    expect(columnNames).toHaveLength(8);
  });

  describe('id column', () => {
    it('is a uuid primary key', () => {
      const col = getTableColumns(messages).id;
      expect(col.name).toBe('id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.primary).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });

  describe('matchId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(messages).matchId;
      expect(col.name).toBe('match_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('senderId column', () => {
    it('is a not-null uuid', () => {
      const col = getTableColumns(messages).senderId;
      expect(col.name).toBe('sender_id');
      expect(col.columnType).toBe('PgUUID');
      expect(col.notNull).toBe(true);
    });
  });

  describe('content column', () => {
    it('is a not-null text', () => {
      const col = getTableColumns(messages).content;
      expect(col.name).toBe('content');
      expect(col.columnType).toBe('PgText');
      expect(col.notNull).toBe(true);
    });
  });

  describe('mediaUrl column', () => {
    it('is a nullable text', () => {
      const col = getTableColumns(messages).mediaUrl;
      expect(col.name).toBe('media_url');
      expect(col.columnType).toBe('PgText');
      expect(col.notNull).toBe(false);
    });
  });

  describe('status column', () => {
    it('is a not-null varchar(10) with default sent', () => {
      const col = getTableColumns(messages).status;
      expect(col.name).toBe('status');
      expect(col.columnType).toBe('PgVarchar');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe('sent');
      expect(col.config.length).toBe(10);
    });
  });

  describe('isDeleted column', () => {
    it('is a not-null boolean with default false', () => {
      const col = getTableColumns(messages).isDeleted;
      expect(col.name).toBe('is_deleted');
      expect(col.columnType).toBe('PgBoolean');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
      expect(col.default).toBe(false);
    });
  });

  describe('createdAt column', () => {
    it('is a not-null timestamp with defaultNow', () => {
      const col = getTableColumns(messages).createdAt;
      expect(col.name).toBe('created_at');
      expect(col.columnType).toBe('PgTimestamp');
      expect(col.notNull).toBe(true);
      expect(col.hasDefault).toBe(true);
    });
  });
});
