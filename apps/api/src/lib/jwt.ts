import process from 'node:process';
import { jwtVerify, SignJWT } from 'jose';

const MIN_SECRET_LENGTH = 32;

function requireEnv(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters long`);
  }
  return new TextEncoder().encode(value);
}

/** Lazy-initialized secrets — crash at first use, not at import time */
let _jwtSecret: Uint8Array | null = null;
let _refreshSecret: Uint8Array | null = null;
let _adminJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) {
    _jwtSecret = requireEnv('JWT_SECRET');
  }
  return _jwtSecret;
}

function getRefreshSecret(): Uint8Array {
  if (!_refreshSecret) {
    _refreshSecret = requireEnv('JWT_REFRESH_SECRET');
  }
  return _refreshSecret;
}

function getAdminJwtSecret(): Uint8Array {
  if (!_adminJwtSecret) {
    _adminJwtSecret = requireEnv('JWT_ADMIN_SECRET');
  }
  return _adminJwtSecret;
}

/**
 * Validate all JWT secrets at startup. Call this before the server starts
 * listening to fail fast if secrets are missing or too short.
 */
export function validateJwtSecrets(): void {
  const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ADMIN_SECRET'] as const;
  for (const name of secrets) {
    const value = process.env[name];
    if (!value) {
      throw new Error(`FATAL: ${name} environment variable is required`);
    }
    if (value.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `FATAL: ${name} must be at least ${MIN_SECRET_LENGTH} characters long (got ${value.length})`,
      );
    }
  }
}

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
    .sign(getJwtSecret());
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret());
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return { sub: payload.sub as string, type: 'access' };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret());
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
    .sign(getAdminJwtSecret());
}

export async function generateAdminRefreshToken(adminId: string, role: string): Promise<string> {
  return new SignJWT({ type: 'admin_refresh', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(ADMIN_REFRESH_TOKEN_EXPIRY)
    .sign(getAdminJwtSecret());
}

export async function verifyAdminAccessToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, getAdminJwtSecret());
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
  const { payload } = await jwtVerify(token, getAdminJwtSecret());
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
