import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { jwtVerify, SignJWT } from 'jose';

const MIN_SECRET_LENGTH = 32;
const PLACEHOLDER_PATTERNS = ['change-me', 'your-secret', 'replace-this', 'placeholder', 'example'];
const ISSUER = 'pawmeet-api';
const AUDIENCE_USER = 'pawmeet:user';
const AUDIENCE_ADMIN = 'pawmeet:admin';

function requireEnv(name: string): Uint8Array {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} environment variable is required`);
  }
  if (value.length < MIN_SECRET_LENGTH) {
    throw new Error(`${name} must be at least ${MIN_SECRET_LENGTH} characters long`);
  }
  const lower = value.toLowerCase();
  if (PLACEHOLDER_PATTERNS.some((p) => lower.includes(p))) {
    throw new Error(`${name} contains a placeholder value — generate a real secret`);
  }
  return new TextEncoder().encode(value);
}

/** Lazy-initialized secrets — crash at first use, not at import time */
let _jwtSecret: Uint8Array | null = null;
let _refreshSecret: Uint8Array | null = null;
let _adminJwtSecret: Uint8Array | null = null;

function getJwtSecret(): Uint8Array {
  if (!_jwtSecret) _jwtSecret = requireEnv('JWT_SECRET');
  return _jwtSecret;
}

function getRefreshSecret(): Uint8Array {
  if (!_refreshSecret) _refreshSecret = requireEnv('JWT_REFRESH_SECRET');
  return _refreshSecret;
}

function getAdminJwtSecret(): Uint8Array {
  if (!_adminJwtSecret) _adminJwtSecret = requireEnv('JWT_ADMIN_SECRET');
  return _adminJwtSecret;
}

/**
 * Validate all JWT secrets at startup. Call this before the server starts
 * listening to fail fast if secrets are missing, too short, or placeholder values.
 */
export function validateJwtSecrets(): void {
  const secrets = ['JWT_SECRET', 'JWT_REFRESH_SECRET', 'JWT_ADMIN_SECRET'] as const;
  for (const name of secrets) {
    requireEnv(name); // throws on missing, too short, or placeholder
  }
}

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  sub: string;
  type: 'access' | 'refresh';
  jti?: string;
  role?: string;
  tokenKind?: 'user' | 'admin';
}

export interface AdminTokenPayload {
  sub: string;
  role: string;
  type: 'admin';
  jti?: string;
}

// ── User JWT ──────────────────────────────────────────────────────────────────

export async function generateAccessToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_USER)
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .sign(getJwtSecret());
}

export async function generateRefreshToken(userId: string): Promise<string> {
  return new SignJWT({ type: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setJti(randomUUID())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_USER)
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(getRefreshSecret());
}

export async function verifyAccessToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE_USER,
  });
  if (payload.type !== 'access') {
    throw new Error('Invalid token type');
  }
  return { sub: payload.sub as string, type: 'access', jti: payload.jti };
}

export async function verifyRefreshToken(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getRefreshSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE_USER,
  });
  if (payload.type !== 'refresh') {
    throw new Error('Invalid token type');
  }
  return { sub: payload.sub as string, type: 'refresh', jti: payload.jti };
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
    .setJti(randomUUID())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_ADMIN)
    .setIssuedAt()
    .setExpirationTime(ADMIN_ACCESS_TOKEN_EXPIRY)
    .sign(getAdminJwtSecret());
}

export async function generateAdminRefreshToken(adminId: string, role: string): Promise<string> {
  return new SignJWT({ type: 'admin_refresh', role })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(adminId)
    .setJti(randomUUID())
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE_ADMIN)
    .setIssuedAt()
    .setExpirationTime(ADMIN_REFRESH_TOKEN_EXPIRY)
    .sign(getAdminJwtSecret());
}

export async function verifyAdminAccessToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, getAdminJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE_ADMIN,
  });
  if (payload.type !== 'admin') {
    throw new Error('Invalid token type: expected admin access token');
  }
  return {
    sub: payload.sub as string,
    role: payload.role as string,
    type: 'admin',
    jti: payload.jti,
  };
}

export async function verifyAdminRefreshToken(token: string): Promise<AdminTokenPayload> {
  const { payload } = await jwtVerify(token, getAdminJwtSecret(), {
    issuer: ISSUER,
    audience: AUDIENCE_ADMIN,
  });
  if (payload.type !== 'admin_refresh') {
    throw new Error('Invalid token type: expected admin refresh token');
  }
  return {
    sub: payload.sub as string,
    role: payload.role as string,
    type: 'admin',
    jti: payload.jti,
  };
}

export async function generateAdminTokenPair(adminId: string, role: string) {
  const [accessToken, refreshToken] = await Promise.all([
    generateAdminAccessToken(adminId, role),
    generateAdminRefreshToken(adminId, role),
  ]);
  return { accessToken, refreshToken };
}
