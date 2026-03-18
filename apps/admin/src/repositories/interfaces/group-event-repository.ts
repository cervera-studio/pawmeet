export interface AdminGroupEventListItem {
  id: string;
  title: string;
  category: string;
  visibility: string;
  status: string;
  scheduledAt: string;
  location: string | null;
  maxParticipants: number | null;
  requiresApproval: boolean;
  participantCount: number;
  pendingCount: number;
  createdAt: string;
  creatorName: string | null;
  creatorId: string;
  isRecurring: boolean;
}

export interface ListGroupEventsParams {
  page: number;
  pageSize: number;
  search?: string;
  status?: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'template';
  category?: 'walk' | 'meetup' | 'training';
}
