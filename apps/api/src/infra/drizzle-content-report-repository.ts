import { contentReports } from '@pawmeet/db';
import type { ContentReport } from '@pawmeet/types';
import type { SQL } from 'drizzle-orm';
import { and, desc, eq, lt, or } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  ContentReportRepository,
  CreateReportInput,
} from '../ports/content-report-repository.js';

function encodeCursor(createdAt: Date, id: string): string {
  return Buffer.from(`${createdAt.toISOString()}|${id}`).toString('base64');
}

function decodeCursor(cursor: string): { createdAt: Date; id: string } | null {
  try {
    const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
    const [iso, id] = decoded.split('|');
    if (!iso || !id) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return { createdAt: date, id };
  } catch {
    return null;
  }
}

export class DrizzleContentReportRepository implements ContentReportRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async createReport(input: CreateReportInput): Promise<ContentReport> {
    const rows = await this.db.insert(contentReports).values(input).returning();
    return rows[0] as ContentReport;
  }

  async findPendingReports(
    cursor: string | null,
    limit: number,
  ): Promise<{
    reports: ContentReport[];
    nextCursor: string | null;
  }> {
    const conditions: SQL[] = [eq(contentReports.status, 'pending')];

    if (cursor) {
      const parsed = decodeCursor(cursor);
      if (parsed) {
        const cursorCondition = or(
          lt(contentReports.createdAt, parsed.createdAt),
          and(eq(contentReports.createdAt, parsed.createdAt), lt(contentReports.id, parsed.id)),
        );
        if (cursorCondition) conditions.push(cursorCondition);
      }
    }

    const rows = await this.db
      .select()
      .from(contentReports)
      .where(and(...conditions))
      .orderBy(desc(contentReports.createdAt), desc(contentReports.id))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const pageRows = hasMore ? rows.slice(0, limit) : rows;

    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor = hasMore && lastRow ? encodeCursor(lastRow.createdAt, lastRow.id) : null;

    return { reports: pageRows as ContentReport[], nextCursor };
  }

  async reviewReport(
    reportId: string,
    reviewerId: string,
    action: 'reviewed' | 'dismissed',
  ): Promise<ContentReport | null> {
    const rows = await this.db
      .update(contentReports)
      .set({
        status: action,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
      })
      .where(eq(contentReports.id, reportId))
      .returning();
    return (rows[0] as ContentReport | undefined) ?? null;
  }

  async hasReported(reporterId: string, contentType: string, contentId: string): Promise<boolean> {
    const [row] = await this.db
      .select({ id: contentReports.id })
      .from(contentReports)
      .where(
        and(
          eq(contentReports.reporterId, reporterId),
          eq(contentReports.contentType, contentType),
          eq(contentReports.contentId, contentId),
        ),
      )
      .limit(1);
    return row !== undefined;
  }
}
