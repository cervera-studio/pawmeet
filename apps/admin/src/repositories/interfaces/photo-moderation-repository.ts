export interface PendingPhoto {
  id: string;
  userId: string;
  userName: string | null;
  dogId: string | null;
  dogName: string | null;
  imageUrl: string;
  type: 'profile' | 'dog';
  uploadedAt: string;
}

export interface PhotoModerationRepository {
  listPending(): Promise<PendingPhoto[]>;
  approve(photoId: string): Promise<void>;
  reject(photoId: string): Promise<void>;
  approveAll(): Promise<void>;
}
