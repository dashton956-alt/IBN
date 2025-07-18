
import { useState, useCallback } from 'react';

interface UseRetryOptions {
  maxRetries?: number;
  delay?: number;
  backoff?: boolean;
}

interface UseRetryReturn<T> {
  execute: (fn: () => Promise<T>) => Promise<T>;
  isRetrying: boolean;
  retryCount: number;
  reset: () => void;
}

export const useRetry = <T = any>(options: UseRetryOptions = {}): UseRetryReturn<T> => {
  const { maxRetries = 3, delay = 1000, backoff = true } = options;
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const execute = useCallback(async (fn: () => Promise<T>): Promise<T> => {
    let attempts = 0;
    setIsRetrying(true);

    while (attempts <= maxRetries) {
      try {
        const result = await fn();
        setRetryCount(attempts);
        setIsRetrying(false);
        return result;
      } catch (error) {
        attempts++;
        
        if (attempts > maxRetries) {
          setIsRetrying(false);
          setRetryCount(attempts - 1);
          throw error;
        }

        // Calculate delay with exponential backoff if enabled
        const currentDelay = backoff ? delay * Math.pow(2, attempts - 1) : delay;
        
        console.log(`Attempt ${attempts} failed, retrying in ${currentDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, currentDelay));
      }
    }

    setIsRetrying(false);
    throw new Error('Max retries exceeded');
  }, [maxRetries, delay, backoff]);

  const reset = useCallback(() => {
    setIsRetrying(false);
    setRetryCount(0);
  }, []);

  return { execute, isRetrying, retryCount, reset };
};
