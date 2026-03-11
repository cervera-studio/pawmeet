export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthService {
  hashPassword(password: string): Promise<string>;
  verifyPassword(password: string, hash: string): Promise<boolean>;
  generateTokenPair(userId: string): Promise<TokenPair>;
  verifyRefreshToken(token: string): Promise<{ sub: string }>;
  hashToken(token: string): Promise<string>;
  hashRefreshToken(token: string): Promise<string>;
}
