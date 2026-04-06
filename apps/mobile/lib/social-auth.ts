import * as AppleAuthentication from 'expo-apple-authentication';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';
import { Platform, TurboModuleRegistry } from 'react-native';

export const isGoogleSignInAvailable = TurboModuleRegistry.get('RNGoogleSignin') != null;

const GoogleSignin = isGoogleSignInAvailable
  ? (
      require('@react-native-google-signin/google-signin') as typeof import('@react-native-google-signin/google-signin')
    ).GoogleSignin
  : null;

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

/**
 * Configure Google Sign-In. Call once at app startup.
 */
export function configureGoogleSignIn(): void {
  if (!GoogleSignin) return;
  const webClientId = Constants.expoConfig?.extra?.googleWebClientId ?? '';
  const iosClientId = Constants.expoConfig?.extra?.googleIosClientId ?? '';
  if (!webClientId) return;
  GoogleSignin.configure({
    webClientId,
    iosClientId: iosClientId || undefined,
    offlineAccess: false,
  });
}

/**
 * Native Google Sign-In via Credential Manager.
 * Returns an idToken to send to the backend for verification.
 */
export async function signInWithGoogle(): Promise<SocialAuthResult> {
  if (!GoogleSignin) {
    throw new Error('Google Sign In non disponibile su questo dispositivo');
  }

  if (Platform.OS === 'android') {
    await GoogleSignin.hasPlayServices();
  }

  const response = await GoogleSignin.signIn();

  if (response.type !== 'success' || !response.data.idToken) {
    throw new Error('Google Sign In: autenticazione annullata');
  }

  const { user, idToken } = response.data;
  const displayName =
    user.givenName && user.familyName
      ? `${user.givenName} ${user.familyName}`
      : (user.name ?? undefined);

  return {
    provider: 'google',
    idToken,
    displayName,
  };
}
