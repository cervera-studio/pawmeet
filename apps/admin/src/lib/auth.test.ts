import type { AdminUser } from './auth';
import { AdminRole, canAccessRoute, hasRole, routePermissions } from './auth';

// -- Builder --

function buildAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'usr_001',
    email: 'admin@pawmeet.test',
    name: 'Test Admin',
    role: AdminRole.Admin,
    ...overrides,
  };
}

// -- AdminRole const object --

describe('AdminRole', () => {
  it('exposes all four roles as string values', () => {
    expect(AdminRole.SuperAdmin).toBe('super_admin');
    expect(AdminRole.Admin).toBe('admin');
    expect(AdminRole.Moderator).toBe('moderator');
    expect(AdminRole.Viewer).toBe('viewer');
  });

  it('has exactly four members', () => {
    expect(Object.keys(AdminRole)).toHaveLength(4);
  });
});

// -- hasRole --

describe('hasRole', () => {
  it('returns true when user role matches required role exactly', () => {
    expect(hasRole(AdminRole.Admin, AdminRole.Admin)).toBe(true);
    expect(hasRole(AdminRole.Viewer, AdminRole.Viewer)).toBe(true);
  });

  it('returns true when user role is higher than required', () => {
    expect(hasRole(AdminRole.SuperAdmin, AdminRole.Viewer)).toBe(true);
    expect(hasRole(AdminRole.SuperAdmin, AdminRole.Admin)).toBe(true);
    expect(hasRole(AdminRole.Admin, AdminRole.Moderator)).toBe(true);
    expect(hasRole(AdminRole.Moderator, AdminRole.Viewer)).toBe(true);
  });

  it('returns false when user role is lower than required', () => {
    expect(hasRole(AdminRole.Viewer, AdminRole.Moderator)).toBe(false);
    expect(hasRole(AdminRole.Viewer, AdminRole.Admin)).toBe(false);
    expect(hasRole(AdminRole.Viewer, AdminRole.SuperAdmin)).toBe(false);
    expect(hasRole(AdminRole.Moderator, AdminRole.Admin)).toBe(false);
    expect(hasRole(AdminRole.Admin, AdminRole.SuperAdmin)).toBe(false);
  });

  it('SuperAdmin satisfies every role', () => {
    const allRoles = Object.values(AdminRole);
    for (const role of allRoles) {
      expect(hasRole(AdminRole.SuperAdmin, role)).toBe(true);
    }
  });

  it('Viewer only satisfies Viewer', () => {
    expect(hasRole(AdminRole.Viewer, AdminRole.Viewer)).toBe(true);
    expect(hasRole(AdminRole.Viewer, AdminRole.Moderator)).toBe(false);
    expect(hasRole(AdminRole.Viewer, AdminRole.Admin)).toBe(false);
    expect(hasRole(AdminRole.Viewer, AdminRole.SuperAdmin)).toBe(false);
  });
});

// -- routePermissions --

describe('routePermissions', () => {
  it('maps /settings to Admin', () => {
    expect(routePermissions['/settings']).toBe(AdminRole.Admin);
  });

  it('maps /users and /moderation to Moderator', () => {
    expect(routePermissions['/users']).toBe(AdminRole.Moderator);
    expect(routePermissions['/moderation']).toBe(AdminRole.Moderator);
  });

  it('maps / to Viewer', () => {
    expect(routePermissions['/']).toBe(AdminRole.Viewer);
  });
});

// -- canAccessRoute --

describe('canAccessRoute', () => {
  it('allows SuperAdmin to access every mapped route', () => {
    const routes = Object.keys(routePermissions);
    for (const route of routes) {
      expect(canAccessRoute(AdminRole.SuperAdmin, route)).toBe(true);
    }
  });

  it('allows Viewer to access /', () => {
    expect(canAccessRoute(AdminRole.Viewer, '/')).toBe(true);
  });

  it('denies Viewer access to /users', () => {
    expect(canAccessRoute(AdminRole.Viewer, '/users')).toBe(false);
  });

  it('denies Viewer access to /settings', () => {
    expect(canAccessRoute(AdminRole.Viewer, '/settings')).toBe(false);
  });

  it('allows Moderator access to /users', () => {
    expect(canAccessRoute(AdminRole.Moderator, '/users')).toBe(true);
  });

  it('denies Moderator access to /settings', () => {
    expect(canAccessRoute(AdminRole.Moderator, '/settings')).toBe(false);
  });

  it('allows Admin access to /settings', () => {
    expect(canAccessRoute(AdminRole.Admin, '/settings')).toBe(true);
  });

  it('matches the most specific (longest) route prefix', () => {
    // /users/123 should match /users (Moderator), not / (Viewer)
    expect(canAccessRoute(AdminRole.Viewer, '/users/123')).toBe(false);
    expect(canAccessRoute(AdminRole.Moderator, '/users/123')).toBe(true);
  });

  it('returns true for unknown routes (no permission entry)', () => {
    // Routes not in the map default to allowed
    expect(canAccessRoute(AdminRole.Viewer, '/unknown-page')).toBe(true);
  });

  it('handles sub-paths of /settings', () => {
    expect(canAccessRoute(AdminRole.Moderator, '/settings/general')).toBe(false);
    expect(canAccessRoute(AdminRole.Admin, '/settings/general')).toBe(true);
  });

  it('handles /dogs path requiring Moderator', () => {
    expect(canAccessRoute(AdminRole.Viewer, '/dogs')).toBe(false);
    expect(canAccessRoute(AdminRole.Moderator, '/dogs')).toBe(true);
    expect(canAccessRoute(AdminRole.Admin, '/dogs')).toBe(true);
  });
});

// -- AdminUser builder --

describe('buildAdminUser', () => {
  it('creates a valid AdminUser with defaults', () => {
    const user = buildAdminUser();
    expect(user.id).toBe('usr_001');
    expect(user.email).toBe('admin@pawmeet.test');
    expect(user.role).toBe(AdminRole.Admin);
  });

  it('allows overriding individual fields', () => {
    const user = buildAdminUser({ role: AdminRole.SuperAdmin, name: 'Super' });
    expect(user.role).toBe(AdminRole.SuperAdmin);
    expect(user.name).toBe('Super');
    expect(user.email).toBe('admin@pawmeet.test');
  });

  it('supports optional avatarUrl', () => {
    const withoutAvatar = buildAdminUser();
    expect(withoutAvatar.avatarUrl).toBeUndefined();

    const withAvatar = buildAdminUser({ avatarUrl: 'https://cdn.test/avatar.png' });
    expect(withAvatar.avatarUrl).toBe('https://cdn.test/avatar.png');
  });
});
