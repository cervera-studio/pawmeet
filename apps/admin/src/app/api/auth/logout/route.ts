import process from 'node:process';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { isValidOrigin } from '@/lib/csrf';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST(request: Request) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('admin_refresh_token')?.value;

  // Notify API to invalidate the refresh token
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          Cookie: `admin_refresh_token=${refreshToken}`,
        },
      });
    } catch {
      // Ignore API errors during logout
    }
  }

  // Clear all auth cookies
  cookieStore.delete('admin_access_token');
  cookieStore.delete('admin_refresh_token');
  cookieStore.delete('admin_session');
  cookieStore.delete('admin_role');

  return NextResponse.json({ success: true });
}
