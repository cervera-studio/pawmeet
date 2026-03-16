import { breeds } from '@pawmeet/db';
import { asc, ilike } from 'drizzle-orm';
import type { NeonHttpDatabase } from 'drizzle-orm/neon-http';
import type { Breed, BreedRepository } from '../ports/breed-repository.js';

export class DrizzleBreedRepository implements BreedRepository {
  constructor(private readonly db: NeonHttpDatabase) {}

  async search(query?: string): Promise<Breed[]> {
    if (!query) {
      const rows = await this.db.select().from(breeds).orderBy(asc(breeds.code));
      return rows.map((r) => ({ ...r, id: String(r.id) }));
    }

    const pattern = `%${query}%`;
    const rows = await this.db
      .select()
      .from(breeds)
      .where(ilike(breeds.code, pattern))
      .orderBy(asc(breeds.code))
      .limit(20);

    return rows.map((r) => ({ ...r, id: String(r.id) }));
  }
}
