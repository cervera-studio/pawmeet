import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');
const REFRESH_SECRET = new TextEncoder().encode(
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret',
);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  role?: string;
  tokenKind?: 'user' | 'admin';
}

export interface AdminTokenPayload {
  sub: string;
  role: string;
  type: 'admin';
}

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return { sub: payload.sub as string, type: 'access' };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { sub: payload.sub as string, type: 'refresh' };
}

export async function generateTokenPair(userId: string) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAccessToken(userId),
    generateRefreshToken(userId),
  ]);
  return { accessToken, refreshToken };
}

// ── Admin JWT ─────────────────────────────────────────────────────────────────

const ADMIN_ACCESS_TOKEN_EXPIRY = '30m';
const ADMIN_REFRESH_TOKEN_EXPIRY = '8h';

export async function generateAdminAccessToken(adminId: string, role: string): Promise<string> {
  return new SignJWT({ type: 'admin', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(ADMIN_ACCESS_TOKEN_EXPIRY)
    .sign(JWT_SECRET);
}

export async function generateAdminRefreshToken(adminId: string, role: string): Promise<string> {
  return new SignJWT({ type: 'admin_refresh', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(ADMIN_REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

export async function verifyAdminAccessToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, JWT_SECRET);
  if (payload.type !== 'admin') {
    throw new Error('Invalid token type: expected admin access token');
  }
  return {
    sub: payload.sub as string,
    role: payload.role as string,
    type: 'admin',
  };
}

export async function verifyAdminRefreshToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, REFRESH_SECRET);
  if (payload.type !== 'admin_refresh') {
    throw new Error('Invalid token type: expected admin refresh token');
  }
  return {
    sub: payload.sub as string,
    role: payload.role as string,
    type: 'admin',
  };
}

export async function generateAdminTokenPair(adminId: string, role: string) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAdminAccessToken(adminId, role),
    generateAdminRefreshToken(adminId, role),
  ]);
  return { accessToken, refreshToken };
}
