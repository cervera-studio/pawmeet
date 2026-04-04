import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { type AdminRole, canAccessRoute } from '@/lib/auth';

const PUBLIC_ROUTES = ['/login', '/api/auth'];

/**
 * Next.js 16 proxy — auth gate + UX-only RBAC.
 *
 * Checks for the `admin_session` cookie set by the auth proxy API routes.
 * Route-level RBAC uses the `admin_role` cookie — this is NOT a security
 * boundary, real enforcement is in `requireRole()` server actions.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes, API routes, and static assets
  if (PUBLIC_ROUTES.some((route) => pathname.startsWith(route))) {
    return NextResponse.next();
  }

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

  // UX-only RBAC gate — real enforcement is in requireRole() server actions.
  const role = (request.cookies.get('admin_role')?.value ?? 'viewer') as AdminRole;

  if (!canAccessRoute(role, pathname)) {
    const dashboardUrl = new URL('/', request.url);
    dashboardUrl.searchParams.set('error', 'access_denied');
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public).*)'],
};
