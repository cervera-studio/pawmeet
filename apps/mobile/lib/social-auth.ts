import * as AppleAuthentication from 'expo-apple-authentication';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId ?? '';
const NONCE_KEY = 'pawmeet_oauth_nonce';

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

/** Persist nonce to SecureStore so it survives component remounts. */
function persistNonce(nonce: string): void {
  SecureStore.setItem(NONCE_KEY, nonce);
}

/** Retrieve and delete the persisted nonce (one-time use). */
function consumePersistedNonce(): string | null {
  const nonce = SecureStore.getItem(NONCE_KEY);
  if (nonce) {
    SecureStore.deleteItemAsync(NONCE_KEY).catch(() => {});
  }
  return nonce;
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

  const nonce = Crypto.getRandomBytes(16).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

  // Persist nonce so it survives component lifecycle across auth redirect
  persistNonce(nonce);

  const [request, response, promptAsync] = AuthSession.useAuthRequest(
    {
      clientId: GOOGLE_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
      extraParams: { nonce },
    },
    googleDiscovery,
  );

  return { request, response, promptAsync, nonce };
}

export function extractGoogleIdToken(
  response: AuthSession.AuthSessionResult | null,
  nonce?: string,
): SocialAuthResult | null {
  if (response?.type !== 'success') return null;

  const idToken = response.params?.id_token;
  if (!idToken) return null;

  // Resolve nonce: prefer explicit argument, fall back to persisted value
  const expectedNonce = nonce ?? consumePersistedNonce();

  // Validate that the nonce in the JWT matches the one we generated
  const payload = decodeJwtPayload(idToken);
  if (!expectedNonce || payload.nonce !== expectedNonce) {
    throw new Error('Google Sign In: nonce mismatch — possible replay attack');
  }

  return {
    provider: 'google',
    idToken,
    nonce: expectedNonce,
  };
}
