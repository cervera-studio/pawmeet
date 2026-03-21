import { WEBAUTHN_RP_ID } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { succeed } from '@pawmeet/types';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { UserRepository } from '../ports/user-repository.js';
import type { ChallengeStore } from './passkey-register-options.js';

interface Deps {
  userRepo: UserRepository;
  passkeyRepo: PasskeyRepository;
  challengeStore: ChallengeStore;
}

export function createPasskeyLoginOptions(deps: Deps) {
  return async (email?: string): Promise<Result<Record<string, unknown>>> => {
    const { userRepo, passkeyRepo, challengeStore } = deps;

    let allowCredentials: { id: string; transports?: AuthenticatorTransportFuture[] }[] | undefined;

    if (email) {
      const user = await userRepo.findByEmail(email);
      if (user) {
        const credentials = await passkeyRepo.findByUserId(user.id);
        allowCredentials = credentials.map((c) => ({
          id: c.credentialId,
          transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
        }));
      }
    }

    const options = await generateAuthenticationOptions({
      rpID: WEBAUTHN_RP_ID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge keyed by the challenge itself (login flow has no userId yet)
    await challengeStore.set(`login:${options.challenge}`, options.challenge);

    return succeed(options as unknown as Record<string, unknown>);
  };
}
