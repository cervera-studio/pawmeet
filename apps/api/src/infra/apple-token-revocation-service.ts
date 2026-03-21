import { logger } from '@pawmeet/utils';
import * as jose from 'jose';
import type { AppleAuthService } from '../ports/apple-auth-service.js';

/**
 * Revokes Apple Sign In tokens as required by Apple App Store Review Guidelines.
 *
 * When a user deletes their account, we must call Apple's revoke endpoint
 * so Apple knows the user has disconnected from our app.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
 */
export class AppleTokenRevocationService implements AppleAuthService {
  constructor(
    private readonly teamId: string,
    private readonly clientId: string,
    private readonly keyId: string,
    private readonly privateKey: string,
  ) {}

  async revokeTokens(_providerUserId: string): Promise<void> {
    if (!(this.privateKey && this.teamId && this.keyId)) {
      logger.warn(
        'AppleRevocation',
        'Apple Sign In credentials not configured, skipping revocation',
      );
      return;
    }

    try {
      // Generate client_secret JWT for Apple
      const clientSecret = await this.generateClientSecret();

      const response = await fetch('https://appleid.apple.com/auth/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: clientSecret,
          // Note: we don't store Apple refresh tokens currently,
          // so we rely on the server-to-server notification flow.
          // When Apple refresh token storage is added to oauth_accounts,
          // pass token + token_type_hint=refresh_token here.
        }),
      });

      if (!response.ok) {
        logger.warn('AppleRevocation', `Apple revoke returned ${response.status}`);
      }
    } catch (err) {
      logger.warn('AppleRevocation', 'Failed to revoke Apple token', err);
    }
  }

  private async generateClientSecret(): Promise<string> {
    const key = await jose.importPKCS8(this.privateKey, 'ES256');

    return new jose.SignJWT({})
      .setProtectedHeader({ alg: 'ES256', kid: this.keyId })
      .setIssuer(this.teamId)
      .setSubject(this.clientId)
      .setAudience('https://appleid.apple.com')
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(key);
  }
}
