import process from 'node:process';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isValidOrigin } from '@/lib/csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';
const ACCESS_TOKEN_MAX_AGE = 30 * 60;
const REFRESH_TOKEN_MAX_AGE = 8 * 60 * 60;

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();

  const response = await fetch(`${API_URL}/admin/auth/mfa/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json();
    return NextResponse.json(error, { status: response.status });
  }

  const data = await response.json();
  const cookieStore = await cookies();

  cookieStore.set('admin_access_token', data.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ACCESS_TOKEN_MAX_AGE,
  });

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

  cookieStore.set('admin_session', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  cookieStore.set('admin_role', data.user.role, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: REFRESH_TOKEN_MAX_AGE,
  });

  return NextResponse.json({ token: data.token, user: data.user });
}
