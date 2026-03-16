export interface AuditEntry {
  adminId: string;
  action: string;
  resourceType: ResourceType;
  resourceId?: string;
  changes?: { before?: Record<string, unknown>; after?: Record<string, unknown> };
  reason?: string;
  ipAddress?: string;
  userAgent?: string;
}

const RESOURCE_TYPE = {
  user: 'user',
  dog: 'dog',
  photo: 'photo',
  report: 'report',
  post: 'post',
  story: 'story',
  event: 'event',
  organization: 'organization',
  sponsor: 'sponsor',
  settings: 'settings',
  deletion: 'deletion',
  admin: 'admin',
  breed: 'breed',
  notification: 'notification',
  challenge: 'challenge',
} as const;

type ResourceType = (typeof RESOURCE_TYPE)[keyof typeof RESOURCE_TYPE];

export type { ResourceType };
export { RESOURCE_TYPE };

export interface AuditLogRepository {
  logAction(entry: AuditEntry): Promise<void>;
}
