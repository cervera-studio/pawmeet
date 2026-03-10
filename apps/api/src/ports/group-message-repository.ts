import type {
  GroupChatMessage,
  GroupConversationSummary,
  PaginatedGroupMessages,
} from '@dogwalk/types';

export interface GroupMessageRepository {
  create(input: {
    eventId: string;
    senderId: string;
    content: string;
    mediaUrl?: string | null;
  }): Promise<GroupChatMessage>;

  findByEvent(
    eventId: string,
    cursor: string | null,
    limit: number,
  ): Promise<PaginatedGroupMessages>;

  getConversationsForUser(userId: string): Promise<GroupConversationSummary[]>;

  markAsRead(eventId: string, userId: string): Promise<void>;

  isEventParticipant(eventId: string, userId: string): Promise<boolean>;

  getParticipantUserIds(eventId: string): Promise<string[]>;
}
