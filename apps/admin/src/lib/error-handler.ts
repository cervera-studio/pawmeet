/**
 * Extracts a user-friendly error message from various error types.
 * Handles tRPC errors, standard Error instances, and unknown values.
 */
export function handleError(error: unknown, fallbackMessage: string): string {
  if (error instanceof Error) {
    // tRPC client errors expose a `message` property with the server message
    if (error.message && error.message !== 'undefined') {
      return error.message;
    }
    return fallbackMessage;
  }

  if (typeof error === 'string' && error.length > 0) {
    return error;
  }

  return fallbackMessage;
}
