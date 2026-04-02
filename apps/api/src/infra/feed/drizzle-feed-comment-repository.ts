import { postComments, posts, users } from '@pawmeet/db';
import type { PostComment } from '@pawmeet/types';
import { and, desc, eq, inArray, lt, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { CommentsPage, FeedCommentRepository } from '../../ports/feed-repository.js';
import { decodeCursor, encodeCursor } from './cursor.js';

export class DrizzleFeedCommentRepository implements FeedCommentRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async addComment(input: {
    postId: string;
    authorId: string;
    content: string;
    parentId: string | null;
  }): Promise<PostComment> {
    return await this.db.transaction(async (tx) => {
      const rows = await tx.insert(postComments).values(input).returning();
      await tx
        .update(posts)
        .set({ commentsCount: sql`${posts.commentsCount} + 1` })
        .where(eq(posts.id, input.postId));
      return rows[0] as PostComment;
    });
  }

  async findCommentById(id: string): Promise<PostComment | null> {
    const [row] = await this.db.select().from(postComments).where(eq(postComments.id, id));
    return (row as PostComment | undefined) ?? null;
  }

  async softDeleteComment(id: string): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [comment] = await tx
        .select({ postId: postComments.postId })
        .from(postComments)
        .where(eq(postComments.id, id));
      await tx.update(postComments).set({ isDeleted: true }).where(eq(postComments.id, id));
      if (comment) {
        await tx
          .update(posts)
          .set({ commentsCount: sql`GREATEST(${posts.commentsCount} - 1, 0)` })
          .where(eq(posts.id, comment.postId));
      }
    });
  }

  async getComments(postId: string, cursor: string | null, limit: number): Promise<CommentsPage> {
    const parentWhere = and(
      eq(postComments.postId, postId),
      eq(postComments.isDeleted, false),
      sql`${postComments.parentId} IS NULL`,
    );

    let cursorWhere = parentWhere;
    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        cursorWhere = and(
          parentWhere,
          or(
            lt(postComments.createdAt, parsed.createdAt),
            and(eq(postComments.createdAt, parsed.createdAt), lt(postComments.id, parsed.id)),
          ),
        );
      }
    }

    const parentRows = await this.db
      .select({
        comment: postComments,
        authorId: users.id,
        displayName: users.displayName,
        avatarUrl: users.avatarUrl,
      })
      .from(postComments)
      .innerJoin(users, eq(postComments.authorId, users.id))
      .where(cursorWhere)
      .orderBy(desc(postComments.createdAt), desc(postComments.id))
      .limit(limit + 1);

    const hasMore = parentRows.length > limit;
    const pageParents = hasMore ? parentRows.slice(0, limit) : parentRows;
    const parentIds = pageParents.map((r) => r.comment.id);

    let replyRows: typeof parentRows = [];
    if (parentIds.length > 0) {
      replyRows = await this.db
        .select({
          comment: postComments,
          authorId: users.id,
          displayName: users.displayName,
          avatarUrl: users.avatarUrl,
        })
        .from(postComments)
        .innerJoin(users, eq(postComments.authorId, users.id))
        .where(and(inArray(postComments.parentId, parentIds), eq(postComments.isDeleted, false)))
        .orderBy(postComments.createdAt, postComments.id);
    }

    const repliesByParent = new Map<string, typeof parentRows>();
    for (const row of replyRows) {
      const pid = row.comment.parentId as string;
      const list = repliesByParent.get(pid) ?? [];
      list.push(row);
      repliesByParent.set(pid, list);
    }

    const allRows: typeof parentRows = [];
    for (const parent of pageParents) {
      allRows.push(parent);
      const replies = repliesByParent.get(parent.comment.id);
      if (replies) allRows.push(...replies);
    }

    const comments = allRows.map((row) => ({
      ...(row.comment as PostComment),
      author: {
        id: row.authorId,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
      },
    }));

    const lastParent = pageParents.at(-1);
    const nextCursor =
      hasMore && lastParent
        ? encodeCursor(lastParent.comment.createdAt, lastParent.comment.id)
        : null;

    return { comments, nextCursor };
  }
}
