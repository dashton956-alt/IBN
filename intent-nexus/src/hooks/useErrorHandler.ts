
import { useState, useCallback } from 'react';
import { toast } from "@/hooks/use-toast";

interface UseErrorHandlerReturn {
  error: Error | null;
  isError: boolean;
  handleError: (error: Error | string, customMessage?: string) => void;
  clearError: () => void;
  retry: (fn: () => Promise<any>) => Promise<void>;
}

export const useErrorHandler = (): UseErrorHandlerReturn => {
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback((error: Error | string, customMessage?: string) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    setError(errorObj);
    
    console.error('Error handled:', errorObj);
    
    toast({
      title: "Error",
      description: customMessage || errorObj.message || "An unexpected error occurred",
      variant: "destructive",
    });
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const retry = useCallback(async (fn: () => Promise<any>) => {
    try {
      clearError();
      await fn();
    } catch (error) {
      handleError(error as Error);
    }
  }, [handleError, clearError]);

  return {
    error,
    isError: !!error,
    handleError,
    clearError,
    retry
  };
};
