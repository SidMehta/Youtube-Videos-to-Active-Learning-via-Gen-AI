import { useState, useCallback } from 'react';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

export const useLearningError = (dispatch) => {
  const [error, setError] = useState(null);

  const handleError = useCallback(async (error, context, retryFn) => {
    console.error(`Error in ${context}:`, error);

    // Create error object with additional context
    const errorObj = {
      message: error.message || 'An unexpected error occurred',
      context,
      timestamp: Date.now(),
      recoverable: Boolean(retryFn),
      retryCount: 0,
      retry: async () => {
        if (!retryFn) return false;

        setError(prev => prev ? {
          ...prev,
          retryCount: (prev.retryCount || 0) + 1,
          lastRetry: Date.now()
        } : null);

        // Check retry count
        if (errorObj.retryCount >= MAX_RETRIES) {
          setError(prev => ({
            ...prev,
            message: 'Maximum retry attempts reached. Please try again later.',
            recoverable: false
          }));
          return false;
        }

        try {
          // Add delay between retries
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          const result = await retryFn();
          setError(null);
          return true;
        } catch (retryError) {
          console.error('Retry failed:', retryError);
          errorObj.retryCount++;
          return false;
        }
      }
    };

    setError(errorObj);
    
    // Try to save state if possible
    dispatch?.({
      type: 'SET_ERROR',
      payload: errorObj
    });

    return false;
  }, [dispatch]);

  const clearError = useCallback(() => {
    setError(null);
    dispatch?.({
      type: 'CLEAR_ERROR'
    });
  }, [dispatch]);

  const recoverFromError = useCallback(async () => {
    if (!error?.recoverable || !error?.retry) {
      return false;
    }

    try {
      const success = await error.retry();
      if (success) {
        clearError();
      }
      return success;
    } catch (recoverError) {
      console.error('Recovery failed:', recoverError);
      return false;
    }
  }, [error, clearError]);

  return {
    error,
    handleError,
    clearError,
    recoverFromError
  };
};

export default useLearningError;