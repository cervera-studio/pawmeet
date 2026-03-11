import { MIN_USER_AGE } from '@dogwalk/config';
import type { Result } from '@dogwalk/types';
import { AppError, fail, succeed } from '@dogwalk/types';
import { calculateAge } from '@dogwalk/utils';
import { logSecurityEvent, SECURITY_EVENT } from '../lib/security-log.js';
import type { UserRepository } from '../ports/user-repository.js';

interface Deps {
  userRepo: UserRepository;
}

export function createSubmitDateOfBirth({ userRepo }: Deps) {
  return async (userId: string, dateOfBirth: Date): Promise<Result<{ message: string }>> => {
    const user = await userRepo.findById(userId);
    if (!user) {
      return fail(new AppError('USER_NOT_FOUND', 'Utente non trovato', 404));
    }

    // Prevent overwriting an already-set date of birth
    if (user.dateOfBirth) {
      return fail(new AppError('AGE_ALREADY_VERIFIED', 'Data di nascita già impostata', 409));
    }

    // Server-side age validation
    if (calculateAge(dateOfBirth) < MIN_USER_AGE) {
      logSecurityEvent({
        event: SECURITY_EVENT.AgeVerificationFailed,
        userId,
        metadata: { claimedAge: calculateAge(dateOfBirth) },
      });
      return fail(
        new AppError(
          'AGE_VERIFICATION_FAILED',
          `Devi avere almeno ${MIN_USER_AGE} anni per usare DogWalk`,
          403,
        ),
      );
    }

    await userRepo.update(userId, { dateOfBirth });

    return succeed({ message: 'Data di nascita aggiornata' });
  };
}
