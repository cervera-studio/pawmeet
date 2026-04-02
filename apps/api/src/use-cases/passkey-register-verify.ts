import { WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID } from '@pawmeet/config';
import type { Result } from '@pawmeet/types';
import { AppError, fail, succeed } from '@pawmeet/types';
import type { RegistrationResponseJSON } from '@simplewebauthn/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { ERROR_MESSAGES } from '../constants/messages.js';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { PasskeyRepository } from '../ports/passkey-repository.js';
import type { ChallengeStore } from './passkey-register-options.js';

interface Deps {
  passkeyRepo: PasskeyRepository;
  challengeStore: ChallengeStore;
}

export interface PasskeyRegisterVerifyInput {
  response: RegistrationResponseJSON;
  friendlyName?: string;
}

export function createPasskeyRegisterVerify(deps: Deps) {
  return async (
    userId: string,
    input: PasskeyRegisterVerifyInput,
  ): Promise<Result<{ id: string; friendlyName: string | null }>> => {
    const { passkeyRepo, challengeStore } = deps;

    const expectedChallenge = await challengeStore.get(userId);
    if (!expectedChallenge) {
      return fail(
        new AppError('PASSKEY_CHALLENGE_EXPIRED', ERROR_MESSAGES.PASSKEY_CHALLENGE_EXPIRED, 400),
      );
    }

    await challengeStore.del(userId);

    let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
    try {
      verification = await verifyRegistrationResponse({
        response: input.response,
        expectedChallenge,
        expectedOrigin: WEBAUTHN_ORIGIN,
        expectedRPID: WEBAUTHN_RP_ID,
      });
    } catch {
      return fail(
        new AppError(
          'PASSKEY_VERIFICATION_FAILED',
          ERROR_MESSAGES.PASSKEY_VERIFICATION_FAILED,
          400,
        ),
      );
    }

    if (!(verification.verified && verification.registrationInfo)) {
      return fail(
        new AppError(
          'PASSKEY_VERIFICATION_FAILED',
          ERROR_MESSAGES.PASSKEY_VERIFICATION_FAILED,
          400,
        ),
      );
    }

    const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

    const credential_record = await passkeyRepo.create({
      userId,
      credentialId: credential.id,
      publicKey: Buffer.from(credential.publicKey),
      counter: credential.counter,
      deviceType: credentialDeviceType,
      backedUp: credentialBackedUp,
      transports: credential.transports as string[] | undefined,
      friendlyName: input.friendlyName,
    });

    logSecurityEvent({
      event: SECURITY_EVENT.AccountLinked,
      userId,
      metadata: { provider: 'passkey', action: 'registered', credentialId: credential.id },
    });

    return succeed({ id: credential_record.id, friendlyName: credential_record.friendlyName });
  };
}
