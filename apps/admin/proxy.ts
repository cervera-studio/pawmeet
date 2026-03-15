import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const PUBLIC_ROUTES = ['/login', '/api/auth'];

const ROLE_HIERARCHY: Record<string, number> = {
  super_admin: 4,
  admin: 3,
  moderator: 2,
  viewer: 1,
};

const ROUTE_MIN_ROLE: Record<string, string> = {
  '/settings': 'admin',
  '/audit-log': 'admin',
  '/account-deletions': 'admin',
  '/users': 'moderator',
  '/moderation': 'moderator',
  '/dogs': 'moderator',
  '/safety': 'moderator',
  '/organizations': 'moderator',
  '/group-events': 'moderator',
  '/': 'viewer',
};

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, API routes, and static assets
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

  // Allow theme-init.js and other public files
  if (pathname.startsWith('/theme-init')) {
    return NextResponse.next();
  }

  // Check for session indicator
  const session = request.cookies.get('admin_session')?.value;
  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Route-level RBAC check (UX only — real enforcement is server-side)
  const role = request.cookies.get('admin_role')?.value ?? 'viewer';
  const userLevel = ROLE_HIERARCHY[role] ?? 0;

  const requiredEntry = Object.entries(ROUTE_MIN_ROLE)
    .sort(([a], [b]) => b.length - a.length)
    .find(([route]) => pathname.startsWith(route));

  if (requiredEntry) {
    const requiredLevel = ROLE_HIERARCHY[requiredEntry[1]] ?? 0;
    if (userLevel < requiredLevel) {
      // Redirect to dashboard if insufficient permissions
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
