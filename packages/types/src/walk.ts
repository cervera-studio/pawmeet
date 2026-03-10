export const WALK_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const;

export type WalkStatus = (typeof WALK_STATUS)[keyof typeof WALK_STATUS];

export interface Walk {
  id: string;
  matchId: string;
  createdBy: string;
  title: string | null;
  scheduledAt: Date;
  durationMin: number;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  status: WalkStatus;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
