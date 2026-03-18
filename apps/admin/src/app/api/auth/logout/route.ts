import process from 'node:process';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get('admin_refresh_token')?.value;

  // Notify API to invalidate the refresh token
  if (refreshToken) {
    try {
      await fetch(`${API_URL}/admin/auth/logout`, {
        method: 'POST',
        headers: {
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
