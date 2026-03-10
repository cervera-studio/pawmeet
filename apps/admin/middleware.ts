import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * Lightweight middleware that checks for the refresh token cookie.
 * This does NOT validate the JWT — it only checks for cookie existence
 * to avoid a flash of dashboard content before the client-side auth check kicks in.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public paths without auth check
  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Check for the HttpOnly refresh token cookie
  const refreshToken = request.cookies.get('admin_refresh_token');

  if (!refreshToken?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Match all paths except static files, _next internals, and api routes
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
