import type { ChatMessage } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { TRPCError } from '@trpc/server';
import { describe, expect, it, vi } from 'vitest';
import type { chatDeps } from '../../container.js';
import type { ConversationSummary } from '../../ports/index.js';
import { router } from '../trpc.js';
import { createChatRouter } from './chat.js';

// ── Builders ──────────────────────────────────────────────────────────────────

function buildMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: 'msg-1',
    matchId: 'match-1',
    senderId: 'user-1',
    content: 'Ciao!',
    mediaUrl: null,
    status: 'sent',
    isDeleted: false,
    createdAt: new Date('2026-03-01T10:00:00Z'),
    ...overrides,
  };
}

function buildConversation(overrides: Partial<ConversationSummary> = {}): ConversationSummary {
  return {
    matchId: 'match-1',
    compatibilityScore: 0.85,
    otherUser: { id: 'user-2', displayName: 'Anna', avatarUrl: null },
    otherDogName: 'Bella',
    lastMessage: buildMessage(),
    unreadCount: 2,
    ...overrides,
  };
}

function buildChatDeps(overrides: Partial<typeof chatDeps> = {}): typeof chatDeps {
  return {
    listConversations: vi.fn().mockResolvedValue(succeed({ conversations: [buildConversation()] })),
    getMessages: vi.fn().mockResolvedValue(
      succeed({
        messages: [buildMessage()],
        nextCursor: null,
        hasMore: false,
      }),
    ),
    sendMessage: vi.fn().mockResolvedValue(succeed({ message: buildMessage() })),
    markMessagesRead: vi
      .fn()
      .mockResolvedValue(succeed({ message: 'Messaggi segnati come letti' })),
    ...overrides,
  };
}

function createAuthenticatedCaller(deps: typeof chatDeps, userId = 'user-1') {
  const appRouter = router({ chat: createChatRouter(deps) });
  return appRouter.createCaller({ userId });
}

function createAnonCaller(deps: typeof chatDeps) {
  const appRouter = router({ chat: createChatRouter(deps) });
  return appRouter.createCaller({ userId: null });
}

const matchId = '550e8400-e29b-41d4-a716-446655440000';

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('chat router', () => {
  describe('listConversations', () => {
    it('returns conversations for authenticated user', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.chat.listConversations();

      expect(result.conversations).toHaveLength(1);
      expect(result.conversations[0].otherDogName).toBe('Bella');
      expect(result.conversations[0].unreadCount).toBe(2);
      expect(deps.listConversations).toHaveBeenCalledWith('user-1');
    });

    it('returns empty conversations when user has none', async () => {
      const deps = buildChatDeps({
        listConversations: vi.fn().mockResolvedValue(succeed({ conversations: [] })),
      });
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.chat.listConversations();

      expect(result.conversations).toEqual([]);
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildChatDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.chat.listConversations()).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });
  });

  describe('getMessages', () => {
    it('returns messages for a match', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.chat.getMessages({ matchId, limit: 20 });

      expect(result.messages).toHaveLength(1);
      expect(result.messages[0].content).toBe('Ciao!');
      expect(result.hasMore).toBe(false);
      expect(deps.getMessages).toHaveBeenCalledWith('user-1', matchId, undefined, 20);
    });

    it('passes cursor for pagination', async () => {
      const cursorId = '550e8400-e29b-41d4-a716-446655440001';
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await caller.chat.getMessages({ matchId, cursor: cursorId, limit: 10 });

      expect(deps.getMessages).toHaveBeenCalledWith('user-1', matchId, cursorId, 10);
    });

    it('throws NOT_FOUND when user is not a participant', async () => {
      const deps = buildChatDeps({
        getMessages: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.getMessages({ matchId, limit: 20 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildChatDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.chat.getMessages({ matchId, limit: 20 })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects invalid matchId (not UUID)', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.getMessages({ matchId: 'bad', limit: 20 })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.getMessages).not.toHaveBeenCalled();
    });

    it('rejects limit above maximum', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.getMessages({ matchId, limit: 100 })).rejects.toThrow(TRPCError);
      expect(deps.getMessages).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    it('sends a text message', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.chat.sendMessage({ matchId, content: 'Ciao!' });

      expect(result.message.content).toBe('Ciao!');
      expect(deps.sendMessage).toHaveBeenCalledWith('user-1', matchId, 'Ciao!', undefined);
    });

    it('sends a message with media URL', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await caller.chat.sendMessage({
        matchId,
        content: 'Look!',
        mediaUrl: 'https://cdn.example.com/photo.jpg',
      });

      expect(deps.sendMessage).toHaveBeenCalledWith(
        'user-1',
        matchId,
        'Look!',
        'https://cdn.example.com/photo.jpg',
      );
    });

    it('throws NOT_FOUND when user is not a participant', async () => {
      const deps = buildChatDeps({
        sendMessage: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.sendMessage({ matchId, content: 'Ciao!' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildChatDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.chat.sendMessage({ matchId, content: 'Ciao!' })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects invalid matchId (not UUID)', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.sendMessage({ matchId: 'bad', content: 'Ciao!' })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.sendMessage).not.toHaveBeenCalled();
    });

    it('rejects content exceeding max length', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      const longContent = 'x'.repeat(2001);
      await expect(caller.chat.sendMessage({ matchId, content: longContent })).rejects.toThrow(
        TRPCError,
      );
      expect(deps.sendMessage).not.toHaveBeenCalled();
    });

    it('rejects invalid media URL', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(
        caller.chat.sendMessage({ matchId, content: 'Hi', mediaUrl: 'not-a-url' }),
      ).rejects.toThrow(TRPCError);
      expect(deps.sendMessage).not.toHaveBeenCalled();
    });
  });

  describe('markMessagesRead', () => {
    it('marks messages as read', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      const result = await caller.chat.markMessagesRead({ matchId });

      expect(result.message).toBe('Messaggi segnati come letti');
      expect(deps.markMessagesRead).toHaveBeenCalledWith('user-1', matchId);
    });

    it('throws NOT_FOUND when user is not a participant', async () => {
      const deps = buildChatDeps({
        markMessagesRead: vi
          .fn()
          .mockResolvedValue(
            fail(new AppError('CONVERSATION_NOT_FOUND', 'Conversazione non trovata', 404)),
          ),
      });
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.markMessagesRead({ matchId })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      });
    });

    it('rejects unauthenticated callers', async () => {
      const deps = buildChatDeps();
      const caller = createAnonCaller(deps);

      await expect(caller.chat.markMessagesRead({ matchId })).rejects.toMatchObject({
        code: 'UNAUTHORIZED',
      });
    });

    it('rejects invalid matchId (not UUID)', async () => {
      const deps = buildChatDeps();
      const caller = createAuthenticatedCaller(deps);

      await expect(caller.chat.markMessagesRead({ matchId: 'bad' })).rejects.toThrow(TRPCError);
      expect(deps.markMessagesRead).not.toHaveBeenCalled();
    });
  });
});
