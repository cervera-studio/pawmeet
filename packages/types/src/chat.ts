export type MessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  matchId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  status: MessageStatus;
  isDeleted: boolean;
  createdAt: Date;
}
