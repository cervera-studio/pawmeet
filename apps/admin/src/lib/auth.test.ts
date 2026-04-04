import type { AdminUser } from './auth';
import { ADMIN_ROLE, canAccessRoute, hasRole, routePermissions } from './auth';

// -- Builder --

function buildAdminUser(overrides: Partial<AdminUser> = {}): AdminUser {
  return {
    id: 'usr_001',
    email: 'admin@pawmeet.test',
    name: 'Test Admin',
    role: ADMIN_ROLE.ADMIN,
    ...overrides,
  };
}

// -- ADMIN_ROLE const object --

describe('ADMIN_ROLE', () => {
  it('exposes all four roles as string values', () => {
    expect(ADMIN_ROLE.SUPER_ADMIN).toBe('super_admin');
    expect(ADMIN_ROLE.ADMIN).toBe('admin');
    expect(ADMIN_ROLE.MODERATOR).toBe('moderator');
    expect(ADMIN_ROLE.VIEWER).toBe('viewer');
  });

  it('has exactly four members', () => {
    expect(Object.keys(ADMIN_ROLE)).toHaveLength(4);
  });
});

// -- hasRole --

describe('hasRole', () => {
  it('returns true when user role matches required role exactly', () => {
    expect(hasRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.ADMIN)).toBe(true);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.VIEWER)).toBe(true);
  });

  it('returns true when user role is higher than required', () => {
    expect(hasRole(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.VIEWER)).toBe(true);
    expect(hasRole(ADMIN_ROLE.SUPER_ADMIN, ADMIN_ROLE.ADMIN)).toBe(true);
    expect(hasRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.MODERATOR)).toBe(true);
    expect(hasRole(ADMIN_ROLE.MODERATOR, ADMIN_ROLE.VIEWER)).toBe(true);
  });

  it('returns false when user role is lower than required', () => {
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.MODERATOR)).toBe(false);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.ADMIN)).toBe(false);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.SUPER_ADMIN)).toBe(false);
    expect(hasRole(ADMIN_ROLE.MODERATOR, ADMIN_ROLE.ADMIN)).toBe(false);
    expect(hasRole(ADMIN_ROLE.ADMIN, ADMIN_ROLE.SUPER_ADMIN)).toBe(false);
  });

  it('SuperAdmin satisfies every role', () => {
    const allRoles = Object.values(ADMIN_ROLE);
    for (const role of allRoles) {
      expect(hasRole(ADMIN_ROLE.SUPER_ADMIN, role)).toBe(true);
    }
  });

  it('Viewer only satisfies Viewer', () => {
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.VIEWER)).toBe(true);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.MODERATOR)).toBe(false);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.ADMIN)).toBe(false);
    expect(hasRole(ADMIN_ROLE.VIEWER, ADMIN_ROLE.SUPER_ADMIN)).toBe(false);
  });
});

// -- routePermissions --

describe('routePermissions', () => {
  it('maps /settings to Admin', () => {
    expect(routePermissions['/settings']).toBe(ADMIN_ROLE.ADMIN);
  });

  it('maps /users and /moderation to Moderator', () => {
    expect(routePermissions['/users']).toBe(ADMIN_ROLE.MODERATOR);
    expect(routePermissions['/moderation']).toBe(ADMIN_ROLE.MODERATOR);
  });

  it('maps / to Viewer', () => {
    expect(routePermissions['/']).toBe(ADMIN_ROLE.VIEWER);
  });
});

// -- canAccessRoute --

describe('canAccessRoute', () => {
  it('allows SuperAdmin to access every mapped route', () => {
    const routes = Object.keys(routePermissions);
    for (const route of routes) {
      expect(canAccessRoute(ADMIN_ROLE.SUPER_ADMIN, route)).toBe(true);
    }
  });

  it('allows Viewer to access /', () => {
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/')).toBe(true);
  });

  it('denies Viewer access to /users', () => {
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/users')).toBe(false);
  });

  it('denies Viewer access to /settings', () => {
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/settings')).toBe(false);
  });

  it('allows Moderator access to /users', () => {
    expect(canAccessRoute(ADMIN_ROLE.MODERATOR, '/users')).toBe(true);
  });

  it('denies Moderator access to /settings', () => {
    expect(canAccessRoute(ADMIN_ROLE.MODERATOR, '/settings')).toBe(false);
  });

  it('allows Admin access to /settings', () => {
    expect(canAccessRoute(ADMIN_ROLE.ADMIN, '/settings')).toBe(true);
  });

  it('matches the most specific (longest) route prefix', () => {
    // /users/123 should match /users (Moderator), not / (Viewer)
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/users/123')).toBe(false);
    expect(canAccessRoute(ADMIN_ROLE.MODERATOR, '/users/123')).toBe(true);
  });

  it('returns true for unknown routes (no permission entry)', () => {
    // Routes not in the map default to allowed
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/unknown-page')).toBe(true);
  });

  it('handles sub-paths of /settings', () => {
    expect(canAccessRoute(ADMIN_ROLE.MODERATOR, '/settings/general')).toBe(false);
    expect(canAccessRoute(ADMIN_ROLE.ADMIN, '/settings/general')).toBe(true);
  });

  it('handles /dogs path requiring Moderator', () => {
    expect(canAccessRoute(ADMIN_ROLE.VIEWER, '/dogs')).toBe(false);
    expect(canAccessRoute(ADMIN_ROLE.MODERATOR, '/dogs')).toBe(true);
    expect(canAccessRoute(ADMIN_ROLE.ADMIN, '/dogs')).toBe(true);
  });
});

// -- AdminUser builder --

describe('buildAdminUser', () => {
  it('creates a valid AdminUser with defaults', () => {
    const user = buildAdminUser();
    expect(user.id).toBe('usr_001');
    expect(user.email).toBe('admin@pawmeet.test');
    expect(user.role).toBe(ADMIN_ROLE.ADMIN);
  });

  it('allows overriding individual fields', () => {
    const user = buildAdminUser({ role: ADMIN_ROLE.SUPER_ADMIN, name: 'Super' });
    expect(user.role).toBe(ADMIN_ROLE.SUPER_ADMIN);
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
