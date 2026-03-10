import { dogProfiles, matches, messages, users } from '@dogwalk/db';
import { zValidator } from '@hono/zod-validator';
import { and, desc, eq, lt, or, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { z } from 'zod';
import { db } from '../lib/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { joinRoom, sendToRoom, WS_EVENT } from '../ws/chat.js';

type Env = { Variables: { userId: string } };

const sendMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  mediaUrl: z.string().url().optional(),
});

const paginationSchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

/** Check that a user is a participant in a match (owns one of the matched dogs) */
async function isMatchParticipant(matchId: string, userId: string): Promise<boolean> {
  const [match] = await db.select().from(matches).where(eq(matches.id, matchId));
  if (!match || !match.isActive) return false;

  // Check if the user owns either dog in the match
  const [dogA] = await db
    .select({ ownerId: dogProfiles.ownerId })
    .from(dogProfiles)
    .where(eq(dogProfiles.id, match.dogAId));
  const [dogB] = await db
    .select({ ownerId: dogProfiles.ownerId })
    .from(dogProfiles)
    .where(eq(dogProfiles.id, match.dogBId));

  return dogA?.ownerId === userId || dogB?.ownerId === userId;
}

export const chatRoutes = new Hono<Env>()
  .use('/*', authMiddleware)

  /** List all conversations with last message, unread count, and other participant info. */
  .get('/conversations', async (c) => {
    const userId = c.get('userId');

    // Get user's dog IDs
    const userDogs = await db
      .select({ id: dogProfiles.id })
      .from(dogProfiles)
      .where(eq(dogProfiles.ownerId, userId));

    if (userDogs.length === 0) {
      return c.json({ conversations: [] });
    }

    const dogIds = userDogs.map((d) => d.id);

    // Find active matches involving any of the user's dogs
    const userMatches = await db
      .select()
      .from(matches)
      .where(
        and(
          eq(matches.isActive, true),
          or(...dogIds.flatMap((id) => [eq(matches.dogAId, id), eq(matches.dogBId, id)])),
        ),
      );

    // For each match, get the last message and other participant info
    const conversations = await Promise.all(
      userMatches.map(async (match) => {
        // Get last message
        const [lastMessage] = await db
          .select()
          .from(messages)
          .where(and(eq(messages.matchId, match.id), eq(messages.isDeleted, false)))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        // Get unread count (messages sent by others, not yet read)
        const [unreadResult] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.matchId, match.id),
              eq(messages.status, 'sent'),
              eq(messages.isDeleted, false),
              sql`${messages.senderId} != ${userId}`,
            ),
          );

        // Get the other user's info
        const otherDogId = dogIds.includes(match.dogAId) ? match.dogBId : match.dogAId;
        const [otherDog] = await db
          .select({ ownerId: dogProfiles.ownerId, name: dogProfiles.name })
          .from(dogProfiles)
          .where(eq(dogProfiles.id, otherDogId));

        let otherUser = null;
        if (otherDog) {
          const [user] = await db
            .select({
              id: users.id,
              displayName: users.displayName,
              avatarUrl: users.avatarUrl,
            })
            .from(users)
            .where(eq(users.id, otherDog.ownerId));
          otherUser = user ?? null;
        }

        // Join the WebSocket room for this match
        joinRoom(match.id, userId);

        return {
          matchId: match.id,
          compatibilityScore: match.compatibilityScore,
          otherUser,
          otherDogName: otherDog?.name ?? null,
          lastMessage: lastMessage ?? null,
          unreadCount: unreadResult?.count ?? 0,
        };
      }),
    );

    // Sort by last message date (most recent first)
    conversations.sort((a, b) => {
      const aTime = a.lastMessage?.createdAt?.getTime() ?? 0;
      const bTime = b.lastMessage?.createdAt?.getTime() ?? 0;
      return bTime - aTime;
    });

    return c.json({ conversations });
  })

  /** Get message history with cursor-based pagination (older messages first). */
  .get('/conversations/:matchId/messages', zValidator('query', paginationSchema), async (c) => {
    const userId = c.get('userId');
    const matchId = c.req.param('matchId');
    const { cursor, limit } = c.req.valid('query');

    // Check participation
    const isParticipant = await isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return c.json({ error: 'Conversazione non trovata' }, 404);
    }

    // Join room for WebSocket events
    joinRoom(matchId, userId);

    // Build query with cursor-based pagination (older messages)
    const conditions = [eq(messages.matchId, matchId), eq(messages.isDeleted, false)];

    if (cursor) {
      // Get the cursor message's createdAt
      const [cursorMsg] = await db
        .select({ createdAt: messages.createdAt })
        .from(messages)
        .where(eq(messages.id, cursor));

      if (cursorMsg) {
        conditions.push(lt(messages.createdAt, cursorMsg.createdAt));
      }
    }

    const rows = await db
      .select()
      .from(messages)
      .where(and(...conditions))
      .orderBy(desc(messages.createdAt))
      .limit(limit + 1); // Fetch one extra to check for more

    const hasMore = rows.length > limit;
    const messageList = hasMore ? rows.slice(0, limit) : rows;
    const nextCursor = hasMore ? messageList[messageList.length - 1]?.id : null;

    return c.json({
      messages: messageList,
      nextCursor,
      hasMore,
    });
  })

  /** Send a message in a conversation. Emits new_message via WebSocket. */
  .post('/conversations/:matchId/messages', zValidator('json', sendMessageSchema), async (c) => {
    const userId = c.get('userId');
    const matchId = c.req.param('matchId');
    const { content, mediaUrl } = c.req.valid('json');

    // Check participation
    const isParticipant = await isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return c.json({ error: 'Conversazione non trovata' }, 404);
    }

    // Insert message
    const rows = await db
      .insert(messages)
      .values({
        matchId,
        senderId: userId,
        content,
        mediaUrl: mediaUrl ?? null,
      })
      .returning();

    const message = rows[0];
    if (!message) {
      return c.json({ error: "Errore durante l'invio del messaggio" }, 500);
    }

    // Emit to WebSocket room
    sendToRoom(matchId, {
      type: WS_EVENT.NEW_MESSAGE,
      payload: {
        message,
      },
    });

    return c.json({ message }, 201);
  })

  /** Mark all unread messages from others as read. Emits message_read via WebSocket. */
  .patch('/conversations/:matchId/read', async (c) => {
    const userId = c.get('userId');
    const matchId = c.req.param('matchId');

    // Check participation
    const isParticipant = await isMatchParticipant(matchId, userId);
    if (!isParticipant) {
      return c.json({ error: 'Conversazione non trovata' }, 404);
    }

    // Mark all unread messages from other users as read
    await db
      .update(messages)
      .set({ status: 'read' })
      .where(
        and(
          eq(messages.matchId, matchId),
          eq(messages.status, 'sent'),
          sql`${messages.senderId} != ${userId}`,
        ),
      );

    // Notify other participants via WebSocket
    sendToRoom(
      matchId,
      {
        type: WS_EVENT.MESSAGE_READ,
        payload: { matchId, readBy: userId },
      },
      userId,
    );

    return c.json({ message: 'Messaggi segnati come letti' });
  });
