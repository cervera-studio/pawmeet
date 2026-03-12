import { walkAlbums } from '@pawmeet/db';
import type { WalkAlbum } from '@pawmeet/types';
import { eq } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { WalkAlbumRepository } from '../ports/walk-album-repository.js';

export class DrizzleWalkAlbumRepository implements WalkAlbumRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async createAlbum(walkId: string, title: string): Promise<WalkAlbum> {
    const rows = await this.db.insert(walkAlbums).values({ walkId, title }).returning();
    return rows[0] as WalkAlbum;
  }

  async findByWalkId(walkId: string): Promise<WalkAlbum | null> {
    const [row] = await this.db.select().from(walkAlbums).where(eq(walkAlbums.walkId, walkId));
    return (row as WalkAlbum | undefined) ?? null;
  }

  async finalizeAlbum(albumId: string): Promise<void> {
    await this.db.update(walkAlbums).set({ isFinalized: true }).where(eq(walkAlbums.id, albumId));
  }
}
