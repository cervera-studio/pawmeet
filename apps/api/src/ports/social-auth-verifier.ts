export interface SocialAuthPayload {
  email: string | null;
  emailVerified: boolean;
  providerUserId: string;
  displayName: string | null;
}

export interface GoogleCodeExchange {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export interface SocialAuthVerifier {
  verify(provider: 'apple' | 'google', idToken: string, nonce?: string): Promise<SocialAuthPayload>;
  exchangeGoogleCode(exchange: GoogleCodeExchange): Promise<SocialAuthPayload>;
}
