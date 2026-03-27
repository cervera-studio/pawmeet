import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId ?? '';

const googleDiscovery: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface SocialAuthResult {
  provider: 'apple' | 'google';
  idToken: string;
  nonce?: string;
  displayName?: string;
}

/** Decode a JWT payload without verifying signature (nonce check only). */
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const payload = parts[1] ?? '';
  // Base64url -> Base64
  const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const json = atob(padded);
  return JSON.parse(json) as Record<string, unknown>;
}

export async function signInWithApple(): Promise<SocialAuthResult> {
  const rawNonce = Crypto.getRandomBytes(16).reduce(
    (s, b) => s + b.toString(16).padStart(2, '0'),
    '',
  );
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
    nonce: hashedNonce,
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In: nessun identity token ricevuto');
  }

  // Validate nonce in the returned ID token
  const payload = decodeJwtPayload(credential.identityToken);
  if (payload.nonce !== hashedNonce) {
    throw new Error('Apple Sign In: nonce mismatch — possible replay attack');
  }

  const displayName =
    credential.fullName?.givenName && credential.fullName?.familyName
      ? `${credential.fullName.givenName} ${credential.fullName.familyName}`
      : undefined;

  return {
    provider: 'apple',
    idToken: credential.identityToken,
    nonce: rawNonce,
    displayName,
  };
}

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri();

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.Code,
      usePKCE: true,
      redirectUri,
    },
    googleDiscovery,
  );

  return { request, response, promptAsync, redirectUri };
}

export interface GooglePkceResult {
  provider: 'google';
  code: string;
  codeVerifier: string;
  redirectUri: string;
}

export function extractGoogleCode(
  response: AuthSession.AuthSessionResult | null,
  request: AuthSession.AuthRequest | null,
  redirectUri: string,
): GooglePkceResult | null {
  if (response?.type !== 'success') return null;

  const code = response.params?.code;
  if (!code) return null;

  const codeVerifier = request?.codeVerifier;
  if (!codeVerifier) {
    throw new Error('Google Sign In: missing PKCE code verifier');
  }

  return { provider: 'google', code, codeVerifier, redirectUri };
}
