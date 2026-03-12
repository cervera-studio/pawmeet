import type { ChatMessage } from '@pawmeet/types';

export interface ConversationSummary {
  matchId: string;
  compatibilityScore: number;
  otherUser: { id: string; displayName: string; avatarUrl: string | null } | null;
  otherDogName: string | null;
  lastMessage: ChatMessage | null;
  unreadCount: number;
}

export interface PaginatedMessages {
  messages: ChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface MessageRepository {
  getConversationsForUser(userId: string, dogIds: string[]): Promise<ConversationSummary[]>;
  findByMatch(matchId: string, cursor: string | null, limit: number): Promise<PaginatedMessages>;
  create(input: {
    matchId: string;
    senderId: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<ChatMessage>;
  markAsRead(matchId: string, readerId: string): Promise<void>;
  isMatchParticipant(matchId: string, userId: string): Promise<boolean>;
  getOtherParticipant(matchId: string, userId: string): Promise<string | null>;
  countByMatch(matchId: string): Promise<number>;
}
