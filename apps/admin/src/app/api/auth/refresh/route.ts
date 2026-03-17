import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ACCESS_TOKEN_MAX_AGE = 30 * 60; // 30 minutes
const REFRESH_TOKEN_MAX_AGE = 8 * 60 * 60; // 8 hours

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('admin_refresh_token')?.value;

  if (!refreshToken) {
    return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
  }

  // Forward refresh token to API as a cookie (API reads it from cookie)
  const response = await fetch(`${API_URL}/admin/auth/refresh`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `admin_refresh_token=${refreshToken}`,
    },
  });

  if (!response.ok) {
    // Clear stale cookies on auth failure
    cookieStore.delete('admin_access_token');
    cookieStore.delete('admin_refresh_token');
    cookieStore.delete('admin_session');
    cookieStore.delete('admin_role');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const data = await response.json();

  // Update access token cookie
  cookieStore.set('admin_access_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

  // Rotate refresh token from API response
  const setCookieHeader = response.headers.get('set-cookie');
  const refreshMatch = setCookieHeader?.match(/admin_refresh_token=([^;]+)/);
  if (refreshMatch?.[1]) {
    cookieStore.set('admin_refresh_token', refreshMatch[1], {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  // Refresh session indicator
  cookieStore.set('admin_session', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  // Refresh role indicator if user data is returned
  if (data.user?.role) {
    cookieStore.set('admin_role', data.user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_TOKEN_MAX_AGE,
    });
  }

  return NextResponse.json({ token: data.token, user: data.user });
}
