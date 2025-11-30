// Mock react-native modules before importing
const mockAlert = jest.fn();
const mockPlatform = { OS: 'ios' as 'ios' | 'android' | 'web', select: jest.fn((obj: any) => obj.ios) };

jest.mock('react-native', () => ({
  Alert: {
    get alert() {
      return mockAlert;
    },
  },
  Platform: {
    get OS() {
      return mockPlatform.OS;
    },
    select: jest.fn((obj: any) => obj[mockPlatform.OS]),
  },
}));

import {
  ApplicationError,
  ErrorType,
  normalizeError,
  logError,
  showErrorAlert,
  withErrorHandling,
  createDatabaseError,
  createFilesystemError,
  createValidationError,
  createPermissionError,
  createBackupError,
  createWidgetError,
  createTaskManagerError,
  handleAsyncOperation,
} from '@/utils/errorHandling';
import * as Haptics from 'expo-haptics';

describe('ApplicationError', () => {
  it('should create error with message', () => {
    const error = new ApplicationError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.name).toBe('ApplicationError');
  });

  it('should store error code', () => {
    const error = new ApplicationError('Test', 'TEST_CODE');
    expect(error.code).toBe('TEST_CODE');
  });

  it('should store user-friendly message', () => {
    const error = new ApplicationError('Technical msg', 'CODE', 'User msg');
    expect(error.userFriendlyMessage).toBe('User msg');
  });

  it('should store original error', () => {
    const original = new Error('Original');
    const error = new ApplicationError('Wrapped', 'CODE', 'User msg', original);
    expect(error.originalError).toBe(original);
  });
});

describe('normalizeError', () => {
  it('should return ApplicationError as-is', () => {
    const appError = new ApplicationError('Test');
    expect(normalizeError(appError)).toBe(appError);
  });

  it('should convert Error to ApplicationError', () => {
    const error = new Error('Standard error');
    const normalized = normalizeError(error);
    expect(normalized).toBeInstanceOf(ApplicationError);
    expect(normalized.message).toBe('Standard error');
    expect(normalized.originalError).toBe(error);
  });

  it('should convert string to ApplicationError', () => {
    const normalized = normalizeError('String error');
    expect(normalized).toBeInstanceOf(ApplicationError);
    expect(normalized.message).toBe('String error');
  });

  it('should handle unknown error types', () => {
    const normalized = normalizeError({ weird: 'object' });
    expect(normalized).toBeInstanceOf(ApplicationError);
    expect(normalized.message).toBe('An unexpected error occurred');
  });

  it('should use custom default message', () => {
    const normalized = normalizeError(null, 'Custom default');
    expect(normalized.message).toBe('Custom default');
  });
});

describe('logError', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should log error with context', () => {
    const error = new Error('Test error');
    logError(error, 'TestContext');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[TestContext]',
      expect.objectContaining({
        message: 'Test error',
      })
    );
  });

  it('should log ApplicationError details', () => {
    const error = new ApplicationError('Tech', 'CODE', 'User msg');
    logError(error, 'Context');

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Context]',
      expect.objectContaining({
        code: 'CODE',
        userMessage: 'User msg',
      })
    );
  });
});

describe('showErrorAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset Platform.OS to ios
    mockPlatform.OS = 'ios';
  });

  it('should show alert with error message', () => {
    const error = new ApplicationError('Technical', 'CODE', 'User message');
    showErrorAlert(error);

    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      'User message',
      expect.any(Array)
    );
  });

  it('should trigger haptic feedback on mobile', () => {
    const error = new Error('Test');
    showErrorAlert(error);

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(
      Haptics.NotificationFeedbackType.Error
    );
  });

  it('should not trigger haptic feedback on web', () => {
    mockPlatform.OS = 'web';

    const error = new Error('Test');
    showErrorAlert(error);

    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('should include retry button when provided', () => {
    const error = new Error('Test');
    const retryAction = jest.fn();

    showErrorAlert(error, 'Error', {
      retryAction,
      retryButtonText: 'Retry Now',
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Error',
      expect.any(String),
      expect.arrayContaining([
        expect.objectContaining({ text: 'Retry Now' }),
      ])
    );
  });

  it('should call onDismiss callback', () => {
    const error = new Error('Test');
    const onDismiss = jest.fn();

    showErrorAlert(error, 'Error', { onDismiss });

    const alertCall = mockAlert.mock.calls[0];
    const buttons = alertCall[2];
    const dismissButton = buttons.find((b: any) => b.text === 'OK');
    dismissButton.onPress();

    expect(onDismiss).toHaveBeenCalled();
  });

  it('should use custom dismiss button text', () => {
    const error = new Error('Test');

    showErrorAlert(error, 'Error', { dismissButtonText: 'Close' });

    const alertCall = mockAlert.mock.calls[0];
    const buttons = alertCall[2];
    expect(buttons.some((b: any) => b.text === 'Close')).toBe(true);
  });
});

describe('withErrorHandling', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.clearAllMocks();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('should execute function successfully', async () => {
    const fn = jest.fn().mockResolvedValue('result');
    const wrapped = withErrorHandling(fn, 'TestContext');

    const result = await wrapped('arg1', 'arg2');

    expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
    expect(result).toBe('result');
  });

  it('should catch and rethrow errors', async () => {
    const error = new Error('Test error');
    const fn = jest.fn().mockRejectedValue(error);
    const wrapped = withErrorHandling(fn, 'TestContext');

    await expect(wrapped()).rejects.toThrow(ApplicationError);
  });

  it('should log errors when not silent', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Test'));
    const wrapped = withErrorHandling(fn, 'TestContext');

    try {
      await wrapped();
    } catch (e) {}

    expect(consoleErrorSpy).toHaveBeenCalled();
  });

  it('should not log errors when silent', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Test'));
    const wrapped = withErrorHandling(fn, 'TestContext', { silent: true });

    try {
      await wrapped();
    } catch (e) {}

    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });

  it('should show alert when showAlert is true', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('Test'));
    const wrapped = withErrorHandling(fn, 'TestContext', {
      showAlert: true,
      alertTitle: 'Custom Title',
    });

    try {
      await wrapped();
    } catch (e) {}

    expect(mockAlert).toHaveBeenCalledWith(
      'Custom Title',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('should call onError callback', async () => {
    const onError = jest.fn();
    const fn = jest.fn().mockRejectedValue(new Error('Test'));
    const wrapped = withErrorHandling(fn, 'TestContext', { onError });

    try {
      await wrapped();
    } catch (e) {}

    expect(onError).toHaveBeenCalledWith(expect.any(ApplicationError));
  });
});

describe('Error factory functions', () => {
  it('createDatabaseError should create database error', () => {
    const error = createDatabaseError('DB failed');
    expect(error.code).toBe(ErrorType.DATABASE);
    expect(error.userFriendlyMessage).toContain('database');
  });

  it('createFilesystemError should create filesystem error', () => {
    const error = createFilesystemError('File not found');
    expect(error.code).toBe(ErrorType.FILESYSTEM);
    expect(error.userFriendlyMessage).toContain('files');
  });

  it('createValidationError should create validation error', () => {
    const error = createValidationError('Invalid date', 'Please enter valid date');
    expect(error.code).toBe(ErrorType.VALIDATION);
    expect(error.userFriendlyMessage).toBe('Please enter valid date');
  });

  it('createValidationError should use message as user message if not provided', () => {
    const error = createValidationError('Invalid input');
    expect(error.userFriendlyMessage).toBe('Invalid input');
  });

  it('createPermissionError should create permission error', () => {
    const error = createPermissionError('Camera denied');
    expect(error.code).toBe(ErrorType.PERMISSION);
    expect(error.userFriendlyMessage).toContain('Permission');
  });

  it('createBackupError should create backup error', () => {
    const error = createBackupError('Backup failed');
    expect(error.code).toBe(ErrorType.BACKUP);
    expect(error.userFriendlyMessage).toContain('backup');
  });

  it('createWidgetError should create widget error', () => {
    const error = createWidgetError('Widget refresh failed');
    expect(error.code).toBe(ErrorType.WIDGET);
    expect(error.userFriendlyMessage).toContain('widget');
  });

  it('createTaskManagerError should create task manager error', () => {
    const error = createTaskManagerError('Task failed');
    expect(error.code).toBe(ErrorType.TASK_MANAGER);
    expect(error.userFriendlyMessage).toContain('background tasks');
  });
});

describe('handleAsyncOperation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle successful operation', async () => {
    const setLoading = jest.fn();
    const onSuccess = jest.fn();
    const operation = jest.fn().mockResolvedValue('result');

    const result = await handleAsyncOperation(operation, {
      setLoading,
      onSuccess,
      errorContext: 'Test',
    });

    expect(setLoading).toHaveBeenCalledWith(true);
    expect(setLoading).toHaveBeenCalledWith(false);
    expect(onSuccess).toHaveBeenCalledWith('result');
    expect(result).toBe('result');
  });

  it('should handle failed operation', async () => {
    const setLoading = jest.fn();
    const onError = jest.fn();
    const operation = jest.fn().mockRejectedValue(new Error('Failed'));

    const result = await handleAsyncOperation(operation, {
      setLoading,
      onError,
      errorContext: 'Test',
    });

    expect(setLoading).toHaveBeenCalledWith(false);
    expect(onError).toHaveBeenCalledWith(expect.any(ApplicationError));
    expect(result).toBeNull();
  });

  it('should show alert on error when requested', async () => {
    const setLoading = jest.fn();
    const operation = jest.fn().mockRejectedValue(new Error('Failed'));

    await handleAsyncOperation(operation, {
      setLoading,
      errorContext: 'Test',
      showErrorAlert: true,
      alertTitle: 'Operation Failed',
    });

    expect(mockAlert).toHaveBeenCalledWith(
      'Operation Failed',
      expect.any(String),
      expect.any(Array)
    );
  });

  it('should set loading to false even if operation throws', async () => {
    const setLoading = jest.fn();
    const operation = jest.fn().mockRejectedValue(new Error('Failed'));

    await handleAsyncOperation(operation, {
      setLoading,
      errorContext: 'Test',
    });

    // Should be called twice: true, then false
    expect(setLoading).toHaveBeenCalledTimes(2);
    expect(setLoading).toHaveBeenNthCalledWith(1, true);
    expect(setLoading).toHaveBeenNthCalledWith(2, false);
  });
});
