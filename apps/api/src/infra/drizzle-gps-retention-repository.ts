import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { GpsRetentionRepository } from '../ports/gps-retention-repository.js';

export class DrizzleGpsRetentionRepository implements GpsRetentionRepository {
  constructor(private readonly db: NodePgDatabase) {}

  async purgeOldTrackPoints(retentionDays: number): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM walk_track_points
          WHERE timestamp < NOW() - INTERVAL '${sql.raw(String(retentionDays))} days'`,
    );
  }

  async clearStaleUserLocations(retentionDays: number): Promise<void> {
    await this.db.execute(
      sql`UPDATE users
          SET latitude = NULL, longitude = NULL, location_updated_at = NULL
          WHERE location_updated_at < NOW() - INTERVAL '${sql.raw(String(retentionDays))} days'
          AND latitude IS NOT NULL`,
    );
  }

  async purgeOldSafetyCheckins(retentionDays: number): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM walk_safety_checkins
          WHERE created_at < NOW() - INTERVAL '${sql.raw(String(retentionDays))} days'`,
    );
  }

  async purgeOldNotifications(retentionDays: number): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM notification_log
          WHERE created_at < NOW() - INTERVAL '${sql.raw(String(retentionDays))} days'`,
    );
  }

  async purgeOldAuditLogs(retentionDays: number): Promise<void> {
    await this.db.execute(
      sql`DELETE FROM admin_audit_log
          WHERE created_at < NOW() - INTERVAL '${sql.raw(String(retentionDays))} days'`,
    );
  }
}
