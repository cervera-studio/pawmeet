export interface SocialAuthPayload {
  email: string;
  providerUserId: string;
  displayName: string | null;
}

export interface SocialAuthVerifier {
  verify(provider: 'apple' | 'google', idToken: string, nonce?: string): Promise<SocialAuthPayload>;
}
