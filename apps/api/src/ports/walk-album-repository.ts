import type { WalkAlbum } from '@pawmeet/types';

export interface WalkAlbumRepository {
  createAlbum(walkId: string, title: string): Promise<WalkAlbum>;
  findByWalkId(walkId: string): Promise<WalkAlbum | null>;
  finalizeAlbum(albumId: string): Promise<void>;
}
