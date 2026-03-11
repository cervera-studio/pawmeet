import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * Server-side auth gate. Checks for the `admin_session` cookie which is set
 * by the auth proxy API routes after a successful login/refresh.
 *
 * All auth cookies (access_token, refresh_token, session) are now same-origin,
 * managed by Next.js API routes that proxy to the Fly.io API.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  const session = request.cookies.get('admin_session');

  if (!session?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api).*)'],
};
