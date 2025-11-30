// Note: @testing-library/jest-native is deprecated
// Built-in matchers are now automatically included in @testing-library/react-native v12.4+
// No need to import extend-expect

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => ({}));

// Mock expo modules and winter runtime
jest.mock('expo', () => ({
  registerRootComponent: jest.fn(),
}));

// Mock Expo winter runtime
global.__ExpoImportMetaRegistry = {
  register: jest.fn(),
  get: jest.fn(),
  has: jest.fn().mockReturnValue(false),
};

// Mock structuredClone if not available
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Mock expo-modules-core
jest.mock('expo-modules-core', () => ({
  requireNativeModule: jest.fn(),
  requireNativeViewManager: jest.fn(),
  EventEmitter: jest.fn(),
  Subscription: jest.fn(),
  NativeModule: jest.fn(),
}));

// Mock expo-haptics
jest.mock('expo-haptics', () => ({
  notificationAsync: jest.fn().mockResolvedValue(undefined),
  impactAsync: jest.fn().mockResolvedValue(undefined),
  selectionAsync: jest.fn().mockResolvedValue(undefined),
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock expo-sqlite
jest.mock('expo-sqlite', () => ({
  openDatabaseSync: jest.fn(() => ({
    execSync: jest.fn(),
    getAllSync: jest.fn(() => []),
    getFirstSync: jest.fn(() => null),
    runSync: jest.fn(),
    prepareSync: jest.fn(() => ({
      executeSync: jest.fn(),
      finalizeSync: jest.fn(),
    })),
    closeSync: jest.fn(),
  })),
}));

// Mock expo-file-system
jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://mock-documents/',
  cacheDirectory: 'file://mock-cache/',
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  readAsStringAsync: jest.fn().mockResolvedValue('{}'),
  getInfoAsync: jest.fn().mockResolvedValue({ exists: true, size: 1024 }),
  makeDirectoryAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
  readDirectoryAsync: jest.fn().mockResolvedValue([]),
}));

// Mock expo-sharing
jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn().mockResolvedValue(true),
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

// Mock expo-document-picker
jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn().mockResolvedValue({
    type: 'success',
    uri: 'file://mock-document.json',
    name: 'mock-document.json',
  }),
}));

// Mock react-native-zip-archive
jest.mock('react-native-zip-archive', () => ({
  zip: jest.fn().mockResolvedValue('file://mock-zip.zip'),
  unzip: jest.fn().mockResolvedValue('file://mock-unzipped/'),
}));

// Mock widget manager
jest.mock('@/modules/widget-manager', () => ({
  __esModule: true,
  default: {
    reloadWidgets: jest.fn().mockResolvedValue(undefined),
  },
  isWidgetManagerEnabled: jest.fn(() => false),
}));

// Mock react-native-pell-rich-editor
jest.mock('react-native-pell-rich-editor', () => ({
  RichEditor: 'RichEditor',
  RichToolbar: 'RichToolbar',
  actions: {
    setBold: 'bold',
    setItalic: 'italic',
    setUnderline: 'underline',
    heading1: 'h1',
    heading2: 'h2',
    setParagraph: 'paragraph',
    insertBulletsList: 'ul',
    insertOrderedList: 'ol',
    undo: 'undo',
    redo: 'redo',
  },
}));

// Mock react-native-webview
jest.mock('react-native-webview', () => ({
  WebView: 'WebView',
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock Platform for controlled testing
jest.mock('react-native/Libraries/Utilities/Platform', () => ({
  OS: 'ios',
  select: jest.fn((obj) => obj.ios),
}));

// Mock Alert
jest.mock('react-native/Libraries/Alert/Alert', () => ({
  alert: jest.fn(),
}));

// Global test setup
global.console = {
  ...console,
  // Suppress console warnings and errors in tests unless explicitly needed
  warn: jest.fn(),
  error: jest.fn(),
};
