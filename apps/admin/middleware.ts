import { type NextRequest, NextResponse } from 'next/server';

const PUBLIC_PATHS = ['/login'];

/**
 * Server-side auth gate. Checks for the `admin_session` cookie which is set
 * by the client after a successful login. The actual JWT validation happens
 * client-side via the AuthProvider (access token in memory + refresh via API).
 *
 * The HttpOnly refresh cookie lives on the API domain (cross-origin) and
 * cannot be read here, so we use a lightweight session indicator cookie instead.
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
