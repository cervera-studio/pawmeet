import { AppError } from '@pawmeet/types';

/**
 * Assert that the given entity belongs to the expected user.
 * Throws an AppError with the specified code and message if ownership check fails.
 */
export function assertOwnership(
  entityOwnerId: string,
  userId: string,
  errorCode: string,
  errorMessage: string,
): void {
  if (entityOwnerId !== userId) {
    throw new AppError(errorCode, errorMessage, 403);
  }
}
