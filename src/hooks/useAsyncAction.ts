import { useState, useCallback, useRef } from 'react';

/**
 * Status of an async action
 */
export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Options for useAsyncAction
 */
interface AsyncActionOptions<T, Args extends any[]> {
    /** Callback on successful completion */
    onSuccess?: (result: T, ...args: Args) => void;
    /** Callback on error */
    onError?: (error: Error, ...args: Args) => void;
    /** Callback when action starts */
    onStart?: (...args: Args) => void;
    /** Auto-reset status after success (ms) */
    resetAfter?: number;
    /** Initial data value */
    initialData?: T;
}

/**
 * Return type for useAsyncAction
 */
interface AsyncActionResult<T, Args extends any[]> {
    /** Execute the async action */
    execute: (...args: Args) => Promise<T | undefined>;
    /** Current status */
    status: AsyncStatus;
    /** Result data (on success) */
    data: T | undefined;
    /** Error (on failure) */
    error: Error | undefined;
    /** Convenience booleans */
    isIdle: boolean;
    isLoading: boolean;
    isSuccess: boolean;
    isError: boolean;
    /** Reset to idle state */
    reset: () => void;
}

/**
 * useAsyncAction - Handle async operations with loading, success, and error states
 * 
 * @param asyncFn - The async function to execute
 * @param options - Configuration options
 * 
 * @example
 * const { execute, isLoading, isError, error } = useAsyncAction(
 *   async (id: string) => {
 *     const response = await fetch(`/api/items/${id}`);
 *     return response.json();
 *   },
 *   {
 *     onSuccess: (data) => console.log('Loaded:', data),
 *     onError: (err) => console.error('Failed:', err),
 *     resetAfter: 3000
 *   }
 * );
 * 
 * // Usage
 * execute('123');
 */
export function useAsyncAction<T, Args extends any[] = []>(
    asyncFn: (...args: Args) => Promise<T>,
    options: AsyncActionOptions<T, Args> = {}
): AsyncActionResult<T, Args> {
    const { onSuccess, onError, onStart, resetAfter, initialData } = options;

    const [status, setStatus] = useState<AsyncStatus>('idle');
    const [data, setData] = useState<T | undefined>(initialData);
    const [error, setError] = useState<Error | undefined>(undefined);

    // Track if the component is still mounted
    const mountedRef = useRef(true);
    const resetTimeoutRef = useRef<NodeJS.Timeout>();

    // Cleanup on unmount
    const cleanup = useCallback(() => {
        mountedRef.current = false;
        if (resetTimeoutRef.current) {
            clearTimeout(resetTimeoutRef.current);
        }
    }, []);

    const reset = useCallback(() => {
        if (mountedRef.current) {
            setStatus('idle');
            setError(undefined);
            // Optionally keep data for UI purposes
        }
    }, []);

    const execute = useCallback(
        async (...args: Args): Promise<T | undefined> => {
            // Clear any pending reset
            if (resetTimeoutRef.current) {
                clearTimeout(resetTimeoutRef.current);
            }

            try {
                setStatus('loading');
                setError(undefined);
                onStart?.(...args);

                const result = await asyncFn(...args);

                if (mountedRef.current) {
                    setData(result);
                    setStatus('success');
                    onSuccess?.(result, ...args);

                    // Auto-reset after success if configured
                    if (resetAfter) {
                        resetTimeoutRef.current = setTimeout(() => {
                            if (mountedRef.current) {
                                setStatus('idle');
                            }
                        }, resetAfter);
                    }
                }

                return result;
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));

                if (mountedRef.current) {
                    setError(error);
                    setStatus('error');
                    onError?.(error, ...args);
                }

                return undefined;
            }
        },
        [asyncFn, onSuccess, onError, onStart, resetAfter]
    );

    return {
        execute,
        status,
        data,
        error,
        isIdle: status === 'idle',
        isLoading: status === 'loading',
        isSuccess: status === 'success',
        isError: status === 'error',
        reset,
    };
}

/**
 * useAsyncCallback - Simpler version that just tracks loading state
 * 
 * @example
 * const [save, isSaving] = useAsyncCallback(async () => {
 *   await saveData();
 * });
 */
export function useAsyncCallback<Args extends any[], T>(
    callback: (...args: Args) => Promise<T>
): [(...args: Args) => Promise<T | undefined>, boolean, Error | undefined] {
    const { execute, isLoading, error } = useAsyncAction(callback);
    return [execute, isLoading, error];
}

/**
 * useMutation - Alias for useAsyncAction with mutation-focused naming
 */
export function useMutation<T, Args extends any[] = []>(
    mutationFn: (...args: Args) => Promise<T>,
    options?: AsyncActionOptions<T, Args>
) {
    const result = useAsyncAction(mutationFn, options);
    return {
        mutate: result.execute,
        mutateAsync: result.execute,
        ...result,
    };
}

export default useAsyncAction;
