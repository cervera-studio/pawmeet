/**
 * Structured application error with machine-readable code and HTTP status.
 *
 * @example
 * ```ts
 * const EMAIL_TAKEN = new AppError('AUTH_EMAIL_TAKEN', 'Email già registrata', 409);
 * ```
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly status: number = 400,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Discriminated union for use case return values.
 * Business errors are returned as values instead of thrown exceptions.
 *
 * @example
 * ```ts
 * async function registerUser(input: RegisterInput): Promise<Result<User>> {
 *   const existing = await userRepo.findByEmail(input.email);
 *   if (existing) {
 *     return fail(new AppError('AUTH_EMAIL_TAKEN', 'Email già registrata', 409));
 *   }
 *   const user = await userRepo.create(input);
 *   return succeed(user);
 * }
 * ```
 */
export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: AppError };

/** Create a success Result. */
export function succeed<T>(data: T): Result<T> {
  return { success: true, data };
}

/** Create a failure Result. */
export function fail<T = never>(error: AppError): Result<T> {
  return { success: false, error };
}

/** Type guard to narrow a Result to the success case. */
export function isSuccess<T>(result: Result<T>): result is { success: true; data: T } {
  return result.success === true;
}

/** Type guard to narrow a Result to the failure case. */
export function isFailure<T>(result: Result<T>): result is { success: false; error: AppError } {
  return result.success === false;
}
