import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { handleError } from '@/lib/error-handler';

interface UseErrorHandlerReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T | undefined>;
  isLoading: boolean;
}

/**
 * Wraps async operations with try/catch and shows a toast on error.
 * @param fallbackMessage - Italian fallback message shown when the error has no useful message
 */
export function useErrorHandler<T = void>(fallbackMessage: string): UseErrorHandlerReturn<T> {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(
    async (fn: () => Promise<T>): Promise<T | undefined> => {
      setIsLoading(true);
      try {
        const result = await fn();
        return result;
      } catch (error) {
        const message = handleError(error, fallbackMessage);
        toast.error(message);
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [fallbackMessage],
  );

  return { execute, isLoading };
}
