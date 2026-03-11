import { hashToken } from '../lib/email.js';
import { generateTokenPair, verifyRefreshToken } from '../lib/jwt.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import type { AuthService, TokenPair } from '../ports/auth-service.js';

/** SHA-256 hash for refresh tokens (same as hashToken but kept separate for clarity) */
async function hashRefreshToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export class JwtAuthService implements AuthService {
  async hashPassword(password: string): Promise<string> {
    return hashPassword(password);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return verifyPassword(password, hash);
  }

  async generateTokenPair(userId: string): Promise<TokenPair> {
    return generateTokenPair(userId);
  }

  async verifyRefreshToken(token: string): Promise<{ sub: string }> {
    return verifyRefreshToken(token);
  }

  async hashToken(token: string): Promise<string> {
    return hashToken(token);
  }

  async hashRefreshToken(token: string): Promise<string> {
    return hashRefreshToken(token);
  }
}
