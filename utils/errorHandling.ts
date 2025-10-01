/**
 * Error Handling Utilities
 * Provides standardized error handling across the application
 */

import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface AppError {
  message: string;
  code?: string;
  originalError?: Error;
  userFriendlyMessage?: string;
}

export class ApplicationError extends Error {
  code?: string;
  userFriendlyMessage?: string;
  originalError?: Error;

  constructor(message: string, code?: string, userFriendlyMessage?: string, originalError?: Error) {
    super(message);
    this.name = 'ApplicationError';
    this.code = code;
    this.userFriendlyMessage = userFriendlyMessage;
    this.originalError = originalError;
  }
}

/**
 * Error type constants for categorizing errors
 */
export const ErrorType = {
  DATABASE: 'DATABASE_ERROR',
  NETWORK: 'NETWORK_ERROR',
  FILESYSTEM: 'FILESYSTEM_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  PERMISSION: 'PERMISSION_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
  WIDGET: 'WIDGET_ERROR',
  BACKUP: 'BACKUP_ERROR',
  TASK_MANAGER: 'TASK_MANAGER_ERROR',
} as const;

/**
 * Convert unknown errors to ApplicationError
 */
export function normalizeError(error: unknown, defaultMessage: string = 'An unexpected error occurred'): ApplicationError {
  if (error instanceof ApplicationError) {
    return error;
  }

  if (error instanceof Error) {
    return new ApplicationError(
      error.message || defaultMessage,
      ErrorType.UNKNOWN,
      defaultMessage,
      error
    );
  }

  if (typeof error === 'string') {
    return new ApplicationError(
      error,
      ErrorType.UNKNOWN,
      error
    );
  }

  return new ApplicationError(
    defaultMessage,
    ErrorType.UNKNOWN,
    defaultMessage
  );
}

/**
 * Log error with context
 */
export function logError(error: unknown, context: string): void {
  const normalizedError = normalizeError(error);
  console.error(`[${context}]`, {
    message: normalizedError.message,
    code: normalizedError.code,
    userMessage: normalizedError.userFriendlyMessage,
    stack: normalizedError.stack,
    originalError: normalizedError.originalError,
  });
}

/**
 * Show user-friendly error alert with haptic feedback
 */
export function showErrorAlert(
  error: unknown,
  title: string = 'Error',
  options?: {
    dismissButtonText?: string;
    onDismiss?: () => void;
    retryAction?: () => void;
    retryButtonText?: string;
  }
): void {
  const normalizedError = normalizeError(error);
  const message = normalizedError.userFriendlyMessage || normalizedError.message;

  // Trigger error haptic on mobile
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {
      // Ignore haptic errors
    });
  }

  const buttons = [];

  // Add retry button if provided
  if (options?.retryAction) {
    buttons.push({
      text: options.retryButtonText || 'Retry',
      onPress: options.retryAction,
    });
  }

  // Add dismiss button
  buttons.push({
    text: options?.dismissButtonText || 'OK',
    onPress: options?.onDismiss,
    style: 'cancel' as const,
  });

  Alert.alert(title, message, buttons);
}

/**
 * Wrap an async function with error handling
 */
export function withErrorHandling<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorContext: string,
  options?: {
    showAlert?: boolean;
    alertTitle?: string;
    onError?: (error: ApplicationError) => void;
    silent?: boolean;
  }
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    try {
      return await fn(...args);
    } catch (error) {
      const normalizedError = normalizeError(error);

      // Log the error
      if (!options?.silent) {
        logError(normalizedError, errorContext);
      }

      // Show alert if requested
      if (options?.showAlert) {
        showErrorAlert(normalizedError, options.alertTitle);
      }

      // Call error callback if provided
      if (options?.onError) {
        options.onError(normalizedError);
      }

      throw normalizedError;
    }
  }) as T;
}

/**
 * Create a database error
 */
export function createDatabaseError(
  message: string,
  originalError?: Error
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.DATABASE,
    'There was a problem accessing the database. Please try again.',
    originalError
  );
}

/**
 * Create a filesystem error
 */
export function createFilesystemError(
  message: string,
  originalError?: Error
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.FILESYSTEM,
    'There was a problem accessing files. Please check your storage permissions.',
    originalError
  );
}

/**
 * Create a validation error
 */
export function createValidationError(
  message: string,
  userMessage?: string
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.VALIDATION,
    userMessage || message
  );
}

/**
 * Create a permission error
 */
export function createPermissionError(
  message: string,
  userMessage?: string
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.PERMISSION,
    userMessage || 'Permission required. Please enable this permission in your device settings.'
  );
}

/**
 * Create a backup error
 */
export function createBackupError(
  message: string,
  originalError?: Error
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.BACKUP,
    'Failed to create backup. Please check your storage and try again.',
    originalError
  );
}

/**
 * Create a widget error
 */
export function createWidgetError(
  message: string,
  originalError?: Error
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.WIDGET,
    'Failed to update widget. The widget may not refresh immediately.',
    originalError
  );
}

/**
 * Create a task manager error
 */
export function createTaskManagerError(
  message: string,
  originalError?: Error
): ApplicationError {
  return new ApplicationError(
    message,
    ErrorType.TASK_MANAGER,
    'Failed to configure background tasks. Please check your system settings.',
    originalError
  );
}

/**
 * Handle async operation with loading state
 */
export async function handleAsyncOperation<T>(
  operation: () => Promise<T>,
  options: {
    setLoading: (loading: boolean) => void;
    onError?: (error: ApplicationError) => void;
    onSuccess?: (result: T) => void;
    errorContext: string;
    showErrorAlert?: boolean;
    alertTitle?: string;
  }
): Promise<T | null> {
  try {
    options.setLoading(true);
    const result = await operation();
    options.onSuccess?.(result);
    return result;
  } catch (error) {
    const normalizedError = normalizeError(error);
    logError(normalizedError, options.errorContext);

    if (options.showErrorAlert) {
      showErrorAlert(normalizedError, options.alertTitle);
    }

    options.onError?.(normalizedError);
    return null;
  } finally {
    options.setLoading(false);
  }
}
