export interface SocialAuthPayload {
  email: string;
  providerUserId: string;
  displayName: string | null;
}

export interface SocialAuthVerifier {
  verify(
    provider: 'apple' | 'google',
    idToken: string,
  ): Promise<SocialAuthPayload>;
}
