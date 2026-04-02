import { describe, expect, it, vi } from 'vitest';

vi.mock('@pawmeet/utils', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { logger } from '@pawmeet/utils';
import { logAdminAction, RESOURCE_TYPE } from './admin-audit.js';
import type { AuditEntry, AuditLogRepository } from '../ports/audit-log-repository.js';

function createMockRepo(overrides?: Partial<AuditLogRepository>): AuditLogRepository {
  return {
    logAction: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('admin-audit', () => {
  describe('RESOURCE_TYPE', () => {
    it('contains expected resource types', () => {
      expect(RESOURCE_TYPE.user).toBe('user');
      expect(RESOURCE_TYPE.dog).toBe('dog');
      expect(RESOURCE_TYPE.report).toBe('report');
      expect(RESOURCE_TYPE.organization).toBe('organization');
    });
  });

  describe('logAdminAction', () => {
    it('delegates to repository logAction', async () => {
      const repo = createMockRepo();
      const entry = {
        adminId: 'admin-1',
        action: 'ban_user',
        resourceType: RESOURCE_TYPE.user,
        resourceId: 'user-123',
      } satisfies AuditEntry;

      await logAdminAction(repo, entry);
      expect(repo.logAction).toHaveBeenCalledWith(entry);
    });

    it('does not throw when repository throws (fire-and-forget)', async () => {
      const repo = createMockRepo({
        logAction: vi.fn().mockRejectedValue(new Error('DB down')),
      });

      const entry = {
        adminId: 'admin-1',
        action: 'delete_post',
        resourceType: RESOURCE_TYPE.post,
        resourceId: 'post-1',
      } satisfies AuditEntry;

      await expect(logAdminAction(repo, entry)).resolves.toBeUndefined();
    });

    it('logs error when repository throws', async () => {
      const repo = createMockRepo({
        logAction: vi.fn().mockRejectedValue(new Error('DB down')),
      });

      await logAdminAction(repo, {
        adminId: 'admin-1',
        action: 'update_settings',
        resourceType: RESOURCE_TYPE.settings,
        resourceId: 'global',
      });

      expect(logger.error).toHaveBeenCalledWith(
        'AdminAudit',
        'Failed to log admin action',
        expect.objectContaining({ action: 'update_settings' }),
      );
    });
  });
});
