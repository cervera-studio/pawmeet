export interface GroupChatMessage {
  id: string;
  eventId: string;
  senderId: string;
  content: string;
  mediaUrl: string | null;
  isDeleted: boolean;
  createdAt: Date;
}

export interface GroupConversationSummary {
  eventId: string;
  eventTitle: string;
  participantCount: number;
  lastMessage: GroupChatMessage | null;
  unreadCount: number;
}

export interface PaginatedGroupMessages {
  messages: GroupChatMessage[];
  nextCursor: string | null;
  hasMore: boolean;
}
