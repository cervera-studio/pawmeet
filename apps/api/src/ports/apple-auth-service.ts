/**
 * Port for Apple Sign In token revocation.
 *
 * @see https://developer.apple.com/documentation/sign_in_with_apple/revoke_tokens
 */
export interface AppleAuthService {
  revokeTokens(providerUserId: string): Promise<void>;
}
