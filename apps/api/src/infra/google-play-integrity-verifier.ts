import { logger } from '@pawmeet/utils';
import * as jose from 'jose';
import type { IntegrityVerdict, PlayIntegrityVerifier } from '../ports/play-integrity-verifier.js';

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const INTEGRITY_API = 'https://playintegrity.googleapis.com/v1';
const SCOPE = 'https://www.googleapis.com/auth/playintegrity';

/** Buffer before expiry to avoid using near-expired tokens. */
const TOKEN_EXPIRY_BUFFER_MS = 60_000;

export class GooglePlayIntegrityVerifier implements PlayIntegrityVerifier {
  private cachedAccessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(
    private readonly packageName: string,
    private readonly clientEmail: string,
    private readonly privateKey: string,
  ) {}

  async verify(integrityToken: string): Promise<IntegrityVerdict> {
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${INTEGRITY_API}/${this.packageName}:decodeIntegrityToken`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ integrity_token: integrityToken }),
    });

    if (!response.ok) {
      const body = await response.text();
      logger.error('PlayIntegrity', `decodeIntegrityToken failed: ${response.status} ${body}`);
      throw new Error(`Play Integrity API returned ${response.status}`);
    }

    const data = (await response.json()) as { tokenPayloadExternal: IntegrityVerdict };
    return data.tokenPayloadExternal;
  }

  /**
   * Obtain a Google OAuth2 access token using the service account's private key.
   * Tokens are cached until shortly before expiry.
   */
  private async getAccessToken(): Promise<string> {
    if (this.cachedAccessToken && Date.now() < this.tokenExpiresAt) {
      return this.cachedAccessToken;
    }

    const key = await jose.importPKCS8(this.privateKey, 'RS256');
    const jwt = await new jose.SignJWT({ scope: SCOPE })
      .setProtectedHeader({ alg: 'RS256' })
      .setIssuer(this.clientEmail)
      .setSubject(this.clientEmail)
      .setAudience(TOKEN_ENDPOINT)
      .setIssuedAt()
      .setExpirationTime('1h')
      .sign(key);

    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Google OAuth2 token exchange failed: ${response.status} ${body}`);
    }

    const tokens = (await response.json()) as { access_token: string; expires_in: number };
    this.cachedAccessToken = tokens.access_token;
    this.tokenExpiresAt = Date.now() + tokens.expires_in * 1000 - TOKEN_EXPIRY_BUFFER_MS;

    return this.cachedAccessToken;
  }
}
