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

export async function signInWithApple(): Promise<SocialAuthResult> {
  const credential = await AppleAuthentication.signInAsync({
    requestedScopes: [
      AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
      AppleAuthentication.AppleAuthenticationScope.EMAIL,
    ],
  });

  if (!credential.identityToken) {
    throw new Error('Apple Sign In: nessun identity token ricevuto');
  }

  const displayName =
    credential.fullName?.givenName && credential.fullName?.familyName
      ? `${credential.fullName.givenName} ${credential.fullName.familyName}`
      : undefined;

  return {
    provider: 'apple',
    idToken: credential.identityToken,
    displayName,
  };
}

export function useGoogleAuth() {
  const redirectUri = AuthSession.makeRedirectUri();

  const nonce = Crypto.getRandomBytes(16).reduce((s, b) => s + b.toString(16).padStart(2, '0'), '');

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

  return {
    provider: 'google',
    idToken,
    nonce,
  };
}
