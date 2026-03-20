import type { ChatMessage, Serialized } from '@pawmeet/types';

export interface Conversation {
  [key: string]: unknown;
}

export interface ChatRepository {
  listConversations(): Promise<{ conversations: Conversation[] }>;
  getMessages(matchId: string): Promise<{ messages: Serialized<ChatMessage>[] }>;
  sendMessage(params: {
    matchId: string;
    content: string;
    mediaUrl?: string;
    replyToId?: string;
  }): Promise<{ message: Serialized<ChatMessage> }>;
  markMessagesRead(matchId: string): Promise<void>;
  uploadImage(matchId: string, imageUri: string): Promise<{ mediaUrl: string }>;
}
