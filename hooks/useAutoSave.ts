import { useEffect, useRef, useCallback, useState } from 'react';

interface UseAutoSaveOptions {
  /** Function to call to save the data */
  onSave: (data: any) => Promise<void>;
  /** Debounce delay in milliseconds (default: 2000ms) */
  delay?: number;
  /** Enable/disable auto-save (default: true) */
  enabled?: boolean;
  /** Callback when save starts */
  onSaveStart?: () => void;
  /** Callback when save succeeds */
  onSaveSuccess?: () => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
}

interface UseAutoSaveReturn {
  /** Trigger a save immediately without debouncing */
  saveNow: () => Promise<void>;
  /** Current saving state */
  isSaving: boolean;
  /** Last save timestamp */
  lastSaved: Date | null;
  /** Last error if any */
  error: Error | null;
  /** Clear the error */
  clearError: () => void;
}

/**
 * Hook for automatic saving with debouncing
 *
 * @example
 * const { saveNow, isSaving, lastSaved } = useAutoSave({
 *   data: entryContent,
 *   onSave: async (content) => {
 *     await DatabaseService.saveEntry(content);
 *   },
 *   delay: 2000,
 * });
 */
export function useAutoSave<T>(
  data: T,
  options: UseAutoSaveOptions
): UseAutoSaveReturn {
  const {
    onSave,
    delay = 2000,
    enabled = true,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
  } = options;

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const timeoutRef = useRef<NodeJS.Timeout>();
  const dataRef = useRef(data);
  const isSavingRef = useRef(false);
  const pendingSaveRef = useRef(false);

  // Update data ref when data changes
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Perform the actual save
  const performSave = useCallback(async () => {
    if (isSavingRef.current) {
      // If already saving, mark that we need another save
      pendingSaveRef.current = true;
      return;
    }

    try {
      isSavingRef.current = true;
      setIsSaving(true);
      setError(null);
      onSaveStart?.();

      await onSave(dataRef.current);

      setLastSaved(new Date());
      onSaveSuccess?.();

      // If there was a pending save request while we were saving, trigger another save
      if (pendingSaveRef.current) {
        pendingSaveRef.current = false;
        // Use a short delay before the next save
        setTimeout(() => performSave(), 500);
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Save failed');
      setError(error);
      onSaveError?.(error);
      console.error('Auto-save error:', error);
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [onSave, onSaveStart, onSaveSuccess, onSaveError]);

  // Save immediately without debouncing
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
    }

    await performSave();
  }, [performSave]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!enabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced save
    timeoutRef.current = setTimeout(() => {
      performSave();
    }, delay);

    // Cleanup on unmount or when data changes
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [data, delay, enabled, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    saveNow,
    isSaving,
    lastSaved,
    error,
    clearError,
  };
}
