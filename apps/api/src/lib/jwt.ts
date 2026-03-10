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
