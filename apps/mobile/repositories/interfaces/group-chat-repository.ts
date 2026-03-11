import type { GroupChatMessage, Serialized } from '@dogwalk/types';

export interface GroupConversation {
  [key: string]: unknown;
}

export interface GroupChatRepository {
  listConversations(): Promise<{ conversations: GroupConversation[] }>;
  getMessages(
    eventId: string,
    cursor?: string,
  ): Promise<{
    messages: Serialized<GroupChatMessage>[];
    nextCursor: string | null;
    hasMore: boolean;
  }>;
  sendMessage(eventId: string, content: string): Promise<{ message: Serialized<GroupChatMessage> }>;
  markMessagesRead(eventId: string): Promise<void>;
}
