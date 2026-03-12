import { isSuccess, type Result } from '@pawmeet/types';
import type { Context } from 'hono';
import { match } from 'ts-pattern';

/**
 * Convert a Result from a use case into an HTTP response.
 * Success returns data with the given status code (default 200).
 * Failure returns `{ error, code }` with the AppError's status.
 *
 * @example
 * ```ts
 * app.post('/register', async (c) => {
 *   const result = await registerUser(input);
 *   return handleResult(c, result, 201);
 * });
 * ```
 */
export function handleResult<T>(c: Context, result: Result<T>, successStatus: 200 | 201 = 200) {
  return match(result)
    .with({ success: true }, ({ data }) => c.json(data, successStatus))
    .with({ success: false }, ({ error }) =>
      c.json({ error: error.message, code: error.code }, error.status as 400),
    )
    .exhaustive();
}

/**
 * Unwrap a Result or short-circuit with an HTTP error response.
 * Useful when a route needs the data to continue processing.
 *
 * @example
 * ```ts
 * app.get('/users/:id', async (c) => {
 *   const result = await getUser(id);
 *   if (!isSuccess(result)) return handleResult(c, result);
 *   const user = result.data;
 *   // ... continue with user
 * });
 * ```
 */
export { isSuccess, match };
