import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  doublePrecision,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { dogProfiles } from './dogs';
import { users } from './users';
import { walks } from './walks';

export const posts = pgTable(
  'posts',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    caption: text('caption'),
    latitude: doublePrecision('latitude'),
    longitude: doublePrecision('longitude'),
    walkId: uuid('walk_id').references(() => walks.id, { onDelete: 'set null' }),
    likesCount: integer('likes_count').notNull().default(0),
    commentsCount: integer('comments_count').notNull().default(0),
    moderationStatus: varchar('moderation_status', { length: 10 }).notNull().default('pending'),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('posts_author_idx').on(table.authorId),
    index('posts_walk_idx').on(table.walkId),
    check('posts_likes_count_non_negative', sql`${table.likesCount} >= 0`),
    check('posts_comments_count_non_negative', sql`${table.commentsCount} >= 0`),
    check('posts_latitude_range', sql`${table.latitude} >= -90 AND ${table.latitude} <= 90`),
    check('posts_longitude_range', sql`${table.longitude} >= -180 AND ${table.longitude} <= 180`),
    check(
      'posts_moderation_status_valid',
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);

export const postMedia = pgTable(
  'post_media',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    mediaType: varchar('media_type', { length: 10 }).notNull(),
    thumbnailUrl: text('thumbnail_url'),
    position: integer('position').notNull().default(0),
    moderationStatus: varchar('moderation_status', { length: 10 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('post_media_post_idx').on(table.postId),
    check('post_media_type_valid', sql`${table.mediaType} IN ('photo', 'video')`),
    check('post_media_position_range', sql`${table.position} >= 0 AND ${table.position} <= 9`),
    check(
      'post_media_moderation_status_valid',
      sql`${table.moderationStatus} IN ('pending', 'approved', 'rejected')`,
    ),
  ],
);

export const postLikes = pgTable(
  'post_likes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('post_likes_post_user_idx').on(table.postId, table.userId),
    index('post_likes_user_idx').on(table.userId),
  ],
);

export const postComments = pgTable(
  'post_comments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    parentId: uuid('parent_id').references((): any => postComments.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    isDeleted: boolean('is_deleted').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('post_comments_post_idx').on(table.postId),
    index('post_comments_author_idx').on(table.authorId),
    index('post_comments_parent_idx').on(table.parentId),
  ],
);

export const postTags = pgTable(
  'post_tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    postId: uuid('post_id')
      .notNull()
      .references(() => posts.id, { onDelete: 'cascade' }),
    taggedUserId: uuid('tagged_user_id').references(() => users.id, { onDelete: 'cascade' }),
    taggedDogId: uuid('tagged_dog_id').references(() => dogProfiles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('post_tags_post_idx').on(table.postId),
    index('post_tags_user_idx').on(table.taggedUserId),
    index('post_tags_dog_idx').on(table.taggedDogId),
    uniqueIndex('post_tags_post_user_unique').on(table.postId, table.taggedUserId),
    uniqueIndex('post_tags_post_dog_unique').on(table.postId, table.taggedDogId),
  ],
);

export const stories = pgTable(
  'stories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    authorId: uuid('author_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    mediaUrl: text('media_url').notNull(),
    mediaType: varchar('media_type', { length: 10 }).notNull(),
    thumbnailUrl: text('thumbnail_url'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('stories_author_idx').on(table.authorId),
    index('idx_stories_expires_at').on(table.expiresAt),
    check('stories_media_type_valid', sql`${table.mediaType} IN ('photo', 'video')`),
    check('stories_view_count_non_negative', sql`${table.viewCount} >= 0`),
  ],
);

export const storyViews = pgTable(
  'story_views',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    storyId: uuid('story_id')
      .notNull()
      .references(() => stories.id, { onDelete: 'cascade' }),
    viewerId: uuid('viewer_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('story_views_story_viewer_idx').on(table.storyId, table.viewerId),
    index('story_views_viewer_idx').on(table.viewerId),
  ],
);

export const contentReports = pgTable(
  'content_reports',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    reporterId: uuid('reporter_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    contentType: varchar('content_type', { length: 10 }).notNull(),
    contentId: uuid('content_id').notNull(),
    reason: varchar('reason', { length: 20 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 10 }).notNull().default('pending'),
    reviewedBy: uuid('reviewed_by').references(() => users.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index('content_reports_reporter_idx').on(table.reporterId),
    index('content_reports_reviewed_by_idx').on(table.reviewedBy),
    check(
      'content_reports_content_type_valid',
      sql`${table.contentType} IN ('post', 'comment', 'story')`,
    ),
    check(
      'content_reports_reason_valid',
      sql`${table.reason} IN ('inappropriate', 'spam', 'harassment', 'violence', 'other')`,
    ),
    check(
      'content_reports_status_valid',
      sql`${table.status} IN ('pending', 'reviewed', 'dismissed')`,
    ),
  ],
);

export const walkAlbums = pgTable('walk_albums', {
  id: uuid('id').defaultRandom().primaryKey(),
  walkId: uuid('walk_id')
    .notNull()
    .unique()
    .references(() => walks.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  isFinalized: boolean('is_finalized').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
