import { dogEmbeddings } from '@pawmeet/db';
import { eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { EmbeddingRepository, VectorCandidate } from '../ports/embedding-repository.js';
import { firstRowOrNull } from './drizzle-helpers.js';

export class DrizzleEmbeddingRepository implements EmbeddingRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async upsert(dogId: string, embedding: number[], modelVersion: string): Promise<void> {
    const vectorLiteral = `[${embedding.join(',')}]`;

    await this.db
      .insert(dogEmbeddings)
      .values({
        dogId,
        embedding,
        modelVersion,
      })
      .onConflictDoUpdate({
        target: dogEmbeddings.dogId,
        set: {
          embedding: sql`${vectorLiteral}::vector`,
          modelVersion,
          updatedAt: sql`now()`,
        },
      });
  }

  async findByDogId(dogId: string): Promise<{ embedding: number[]; modelVersion: string } | null> {
    const rows = await this.db
      .select({
        embedding: dogEmbeddings.embedding,
        modelVersion: dogEmbeddings.modelVersion,
      })
      .from(dogEmbeddings)
      .where(eq(dogEmbeddings.dogId, dogId));

    return firstRowOrNull<{ embedding: number[]; modelVersion: string }>(rows);
  }

  async findNearestDogIds(
    embedding: number[],
    limit: number,
    excludeOwnerId: string,
    excludeDogIds: string[] = [],
  ): Promise<VectorCandidate[]> {
    const vectorLiteral = `[${embedding.join(',')}]`;

    const excludeClause =
      excludeDogIds.length > 0
        ? sql`AND de."dog_id" NOT IN (${sql.join(
            excludeDogIds.map((id) => sql`${id}`),
            sql`, `,
          )})`
        : sql``;

    const rows = await this.db.execute(sql`
      SELECT
        de."dog_id" AS "dogId",
        de."embedding" <=> ${vectorLiteral}::vector AS "vectorDistance"
      FROM "dog_embeddings" de
      INNER JOIN "dog_profiles" dp ON dp."id" = de."dog_id"
      INNER JOIN "users" u ON u."id" = dp."owner_id"
      WHERE dp."is_active" = true
        AND u."is_active" = true
        AND dp."owner_id" != ${excludeOwnerId}
        ${excludeClause}
      ORDER BY de."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${limit}
    `);

    return (rows.rows as Record<string, unknown>[]).map((r) => ({
      dogId: r.dogId as string,
      vectorDistance: r.vectorDistance as number,
    }));
  }

  async deleteByDogId(dogId: string): Promise<void> {
    await this.db.delete(dogEmbeddings).where(eq(dogEmbeddings.dogId, dogId));
  }
}
