import { supportMessages, supportTickets, users } from '@pawmeet/db';
import type {
  SupportMessage,
  SupportTicket,
  SupportTicketListItem,
  SupportTicketStatus,
} from '@pawmeet/types';
import { and, desc, eq, isNull, lt, sql } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type {
  AddMessageInput,
  CreateGuestTicketInput,
  CreateTicketInput,
  ListTicketsQuery,
  PaginatedMessages,
  PaginatedTickets,
  SupportRepository,
} from '../ports/support-repository.js';
import { firstRow, firstRowOrNull, rowsAs } from './drizzle-helpers.js';

export class DrizzleSupportRepository implements SupportRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async createTicket(input: CreateTicketInput): Promise<SupportTicket> {
    const rows = await this.db
      .insert(supportTickets)
      .values({
        userId: input.userId,
        subject: input.subject,
        category: input.category,
      })
      .returning();
    return firstRow<SupportTicket>(rows);
  }

  async createGuestTicket(input: CreateGuestTicketInput): Promise<SupportTicket> {
    const rows = await this.db
      .insert(supportTickets)
      .values({
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        subject: input.subject,
        category: input.category,
      })
      .returning();
    return firstRow<SupportTicket>(rows);
  }

  async addMessage(input: AddMessageInput): Promise<SupportMessage> {
    return await this.db.transaction(async (tx) => {
      const rows = await tx
        .insert(supportMessages)
        .values({
          ticketId: input.ticketId,
          senderType: input.senderType,
          senderId: input.senderId,
          content: input.content,
          isInternal: input.isInternal ?? false,
        })
        .returning();

      // Update ticket updatedAt timestamp within the same transaction
      await tx
        .update(supportTickets)
        .set({ updatedAt: new Date() })
        .where(eq(supportTickets.id, input.ticketId));

      return firstRow<SupportMessage>(rows);
    });
  }

  async getTicketById(ticketId: string): Promise<SupportTicket | null> {
    const rows = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);
    return firstRowOrNull<SupportTicket>(rows);
  }

  async getTicketByIdForUser(ticketId: string, userId: string): Promise<SupportTicket | null> {
    const rows = await this.db
      .select()
      .from(supportTickets)
      .where(and(eq(supportTickets.id, ticketId), eq(supportTickets.userId, userId)))
      .limit(1);
    return firstRowOrNull<SupportTicket>(rows);
  }

  async listTicketsByUser(userId: string): Promise<SupportTicket[]> {
    const rows = await this.db
      .select()
      .from(supportTickets)
      .where(eq(supportTickets.userId, userId))
      .orderBy(desc(supportTickets.updatedAt));
    return rowsAs<SupportTicket>(rows);
  }

  async listTickets(query: ListTicketsQuery): Promise<PaginatedTickets> {
    const conditions = [];

    if (query.status) {
      conditions.push(eq(supportTickets.status, query.status));
    }
    if (query.category) {
      conditions.push(eq(supportTickets.category, query.category));
    }
    if (query.assignedTo) {
      conditions.push(eq(supportTickets.assignedTo, query.assignedTo));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Count total
    const [countResult] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportTickets)
      .where(whereClause);
    const total = countResult?.count ?? 0;

    // Fetch page with user info via LEFT JOIN + subquery for last message & count
    const offset = (query.page - 1) * query.pageSize;

    const rows = await this.db
      .select({
        id: supportTickets.id,
        userId: supportTickets.userId,
        guestName: supportTickets.guestName,
        guestEmail: supportTickets.guestEmail,
        subject: supportTickets.subject,
        category: supportTickets.category,
        status: supportTickets.status,
        assignedTo: supportTickets.assignedTo,
        createdAt: supportTickets.createdAt,
        updatedAt: supportTickets.updatedAt,
        userName: users.displayName,
        userEmail: users.email,
        messageCount: sql<number>`(
          SELECT count(*)::int FROM support_messages sm
          WHERE sm.ticket_id = ${supportTickets.id}
        )`,
        lastMessage: sql<string | null>`(
          SELECT sm.content FROM support_messages sm
          WHERE sm.ticket_id = ${supportTickets.id}
          ORDER BY sm.created_at DESC LIMIT 1
        )`,
      })
      .from(supportTickets)
      .leftJoin(users, eq(supportTickets.userId, users.id))
      .where(whereClause)
      .orderBy(desc(supportTickets.updatedAt))
      .limit(query.pageSize)
      .offset(offset);

    const data: SupportTicketListItem[] = rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      guestName: row.guestName,
      guestEmail: row.guestEmail,
      subject: row.subject,
      category: row.category as SupportTicketListItem['category'],
      status: row.status as SupportTicketListItem['status'],
      assignedTo: row.assignedTo,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      userName: row.userName ?? row.guestName,
      userEmail: row.userEmail ?? row.guestEmail,
      messageCount: row.messageCount,
      lastMessage: row.lastMessage,
    }));

    return { data, total };
  }

  async getMessages(
    ticketId: string,
    cursor: string | null,
    limit: number,
    includeInternal: boolean,
  ): Promise<PaginatedMessages> {
    const conditions = [eq(supportMessages.ticketId, ticketId)];

    if (!includeInternal) {
      conditions.push(eq(supportMessages.isInternal, false));
    }

    if (cursor) {
      const [cursorMsg] = await this.db
        .select({ createdAt: supportMessages.createdAt })
        .from(supportMessages)
        .where(eq(supportMessages.id, cursor));

      if (cursorMsg) {
        conditions.push(lt(supportMessages.createdAt, cursorMsg.createdAt));
      }
    }

    const rows = await this.db
      .select()
      .from(supportMessages)
      .where(and(...conditions))
      .orderBy(desc(supportMessages.createdAt))
      .limit(limit + 1);

    const hasMore = rows.length > limit;
    const messageList = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? (messageList.at(-1)?.id ?? null) : null;

    return {
      messages: rowsAs<SupportMessage>(messageList),
      nextCursor,
      hasMore,
    };
  }

  async updateStatus(ticketId: string, status: SupportTicketStatus): Promise<SupportTicket> {
    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === 'resolved') {
      updateData.resolvedAt = now;
    } else if (status === 'closed') {
      updateData.closedAt = now;
    }

    const rows = await this.db
      .update(supportTickets)
      .set(updateData)
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return firstRow<SupportTicket>(rows);
  }

  async assignTicket(ticketId: string, adminId: string | null): Promise<SupportTicket> {
    const rows = await this.db
      .update(supportTickets)
      .set({ assignedTo: adminId, updatedAt: new Date() })
      .where(eq(supportTickets.id, ticketId))
      .returning();
    return firstRow<SupportTicket>(rows);
  }

  async getTicketOwnerUserId(ticketId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ userId: supportTickets.userId })
      .from(supportTickets)
      .where(eq(supportTickets.id, ticketId))
      .limit(1);
    return row?.userId ?? null;
  }

  async countMessagesByTicket(ticketId: string): Promise<number> {
    const [result] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(supportMessages)
      .where(eq(supportMessages.ticketId, ticketId));
    return result?.count ?? 0;
  }

  async markAdminMessagesRead(ticketId: string): Promise<number> {
    const result = await this.db.execute(
      sql`UPDATE support_messages SET read_at = NOW() WHERE ticket_id = ${ticketId} AND sender_type = 'admin' AND read_at IS NULL`,
    );
    return Number(result.rowCount ?? 0);
  }

  async markUserMessagesRead(ticketId: string): Promise<number> {
    const result = await this.db.execute(
      sql`UPDATE support_messages SET read_at = NOW() WHERE ticket_id = ${ticketId} AND sender_type = 'user' AND read_at IS NULL`,
    );
    return Number(result.rowCount ?? 0);
  }
}
