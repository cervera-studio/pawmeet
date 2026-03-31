import { useCallback, useState } from 'react';
import { type AppErrorResult, handleApiError } from '@/lib/error-handler';

interface UseApiErrorReturn {
  apiError: string;
  fieldErrors: Record<string, string>;
  isRetryable: boolean;
  clearErrors: () => void;
  /**
   * Wrap an async API call with centralized error handling.
   * On success returns T; on failure sets error state and returns undefined.
   */
  execute: <T>(fn: () => Promise<T>, context: string) => Promise<T | undefined>;
}

export function useApiError(): UseApiErrorReturn {
  const [apiError, setApiError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [isRetryable, setIsRetryable] = useState(false);

  const clearErrors = useCallback(() => {
    setApiError('');
    setFieldErrors({});
    setIsRetryable(false);
  }, []);

  const execute = useCallback(
    async <T>(fn: () => Promise<T>, context: string): Promise<T | undefined> => {
      clearErrors();
      try {
        return await fn();
      } catch (error) {
        const result: AppErrorResult = handleApiError(error, context);
        setApiError(result.message);
        setFieldErrors(result.fieldErrors);
        setIsRetryable(result.isRetryable);
        return;
      }
    },
    [clearErrors],
  );

  return { apiError, fieldErrors, isRetryable, clearErrors, execute };
}
