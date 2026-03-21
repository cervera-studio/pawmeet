import {
  WEBAUTHN_MAX_CREDENTIALS_PER_USER,
  WEBAUTHN_RP_ID,
  WEBAUTHN_RP_NAME,
} from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { AuthenticatorTransportFuture } from '@simplewebauthn/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  userRepo: UserRepository;
  passkeyRepo: PasskeyRepository;
  challengeStore: ChallengeStore;
}

export interface ChallengeStore {
  set(userId: string, challenge: string): Promise<void>;
  get(userId: string): Promise<string | null>;
  del(userId: string): Promise<void>;
}

export function createPasskeyRegisterOptions(deps: Deps) {
  return async (userId: string): Promise<Result<Record<string, unknown>>> => {
    const { userRepo, passkeyRepo, challengeStore } = deps;

    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'User not found', 404));
    }

    const existingCount = await passkeyRepo.countByUserId(userId);
    if (existingCount >= WEBAUTHN_MAX_CREDENTIALS_PER_USER) {
      return fail(
        new AppError('PASSKEY_LIMIT_REACHED', 'Numero massimo di passkey raggiunto', 400),
      );
    }

    const existingCredentials = await passkeyRepo.findByUserId(userId);
    const excludeCredentials = existingCredentials.map((c) => ({
      id: c.credentialId,
      transports: (c.transports ?? []) as AuthenticatorTransportFuture[],
    }));

    const options = await generateRegistrationOptions({
      rpName: WEBAUTHN_RP_NAME,
      rpID: WEBAUTHN_RP_ID,
      userName: user.email,
      userDisplayName: user.displayName ?? user.email,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    await challengeStore.set(userId, options.challenge);

    return succeed(options as unknown as Record<string, unknown>);
  };
}
