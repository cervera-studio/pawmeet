import { AppError, fail, type Result, succeed } from '@pawmeet/types';
import { logger } from '@pawmeet/utils';
import type { UserRepository } from '../ports/index.js';

const EXPO_PUSH_TOKEN_REGEX = /^ExponentPushToken\[.+\]$/;

type Deps = {
  userRepo: UserRepository;
};

export function createRegisterPushToken({ userRepo }: Deps) {
  return async (userId: string, token: string): Promise<Result<{ registered: boolean }>> => {
    if (!EXPO_PUSH_TOKEN_REGEX.test(token)) {
      return fail(new AppError('INVALID_PUSH_TOKEN', 'Token push non valido', 400));
    }

    try {
      await userRepo.updatePushToken(userId, token);
      return succeed({ registered: true });
    } catch (error) {
      logger.error('registerPushToken', 'Failed to save push token', error);
      return fail(new AppError('INTERNAL_ERROR', 'Errore durante il salvataggio del token', 500));
    }
  };
}
