import { AppError } from '@pawmeet/types';

/**
 * Check that the given entity belongs to the expected user.
 * Returns an AppError if ownership check fails, null otherwise.
 */
export function checkOwnership(
  entityOwnerId: string,
  userId: string,
  errorCode: string,
  errorMessage: string,
): AppError | null {
  if (entityOwnerId !== userId) {
    return new AppError(errorCode, errorMessage, 403);
  }
  return null;
}
