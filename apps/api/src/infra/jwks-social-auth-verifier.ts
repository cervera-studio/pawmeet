import * as jose from 'jose';
import type { SocialAuthPayload, SocialAuthVerifier } from '../ports/social-auth-verifier.js';

const APPLE_JWKS_URI = 'https://appleid.apple.com/auth/keys';
const GOOGLE_JWKS_URI = 'https://www.googleapis.com/oauth2/v3/certs';

export class JwksSocialAuthVerifier implements SocialAuthVerifier {
  private appleJwks: ReturnType<typeof jose.createRemoteJWKSet>;
  private googleJwks: ReturnType<typeof jose.createRemoteJWKSet>;

  constructor(
    private readonly appleBundleId: string,
    private readonly googleClientId: string,
  ) {
    this.appleJwks = jose.createRemoteJWKSet(new URL(APPLE_JWKS_URI));
    this.googleJwks = jose.createRemoteJWKSet(new URL(GOOGLE_JWKS_URI));
  }

  async verify(
    provider: 'apple' | 'google',
    idToken: string,
    nonce?: string,
  ): Promise<SocialAuthPayload> {
    if (provider === 'apple') {
      return this.verifyApple(idToken);
    }
    return this.verifyGoogle(idToken, nonce);
  }

  private async verifyApple(idToken: string): Promise<SocialAuthPayload> {
    const { payload } = await jose.jwtVerify(idToken, this.appleJwks, {
      issuer: 'https://appleid.apple.com',
      audience: this.appleBundleId,
    });

    const email = payload.email as string | undefined;
    if (!email) {
      throw new Error('Apple ID token missing email claim');
    }

    return {
      email,
      providerUserId: payload.sub ?? '',
      displayName: null, // Apple sends name only on first auth, passed separately
    };
  }

  private async verifyGoogle(idToken: string, nonce?: string): Promise<SocialAuthPayload> {
    if (!nonce) {
      throw new Error('Nonce is required for Google authentication');
    }

    const { payload } = await jose.jwtVerify(idToken, this.googleJwks, {
      issuer: ['https://accounts.google.com', 'accounts.google.com'],
      audience: this.googleClientId,
    });

    // Verify nonce to prevent replay attacks
    if (payload.nonce !== nonce) {
      throw new Error('Google ID token nonce mismatch');
    }

    const email = payload.email as string | undefined;
    if (!email) {
      throw new Error('Google ID token missing email claim');
    }

    return {
      email,
      providerUserId: payload.sub ?? '',
      displayName: (payload.name as string) ?? null,
    };
  }
}
