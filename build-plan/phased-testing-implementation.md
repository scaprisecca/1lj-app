# Testing System Implementation Plan for One Line Journal

## Overview
This plan establishes a comprehensive unit testing infrastructure for the One Line Journal app, which currently has no automated tests. The implementation will follow React Native/Expo best practices and prioritize testing critical business logic first.

## Current State
- **No testing framework** installed
- **No test files** exist in the codebase
- React Native 0.79.1 + Expo SDK 54
- Service layer architecture with dual-mode support (SQLite + mock)
- Complex components with rich text editing
- Custom native modules (widgets)
- Heavy AsyncStorage usage

## Testing Stack

### Core Dependencies
```json
{
  "devDependencies": {
    "@testing-library/react-native": "^12.4.0",
    "@testing-library/jest-native": "^5.4.3",
    "@testing-library/react-hooks": "^8.0.1",
    "jest": "^29.7.0",
    "jest-expo": "^51.0.1",
    "react-test-renderer": "19.1.0",
    "@types/jest": "^29.5.11"
  }
}
```

**Rationale:**
- **Jest**: Industry-standard, excellent TypeScript support, built-in coverage
- **@testing-library/react-native**: Best practices for component testing, accessibility-focused
- **jest-expo**: Expo-specific preset with proper transforms and mocks
- **@testing-library/jest-native**: Custom matchers (toBeVisible, toHaveTextContent, etc.)

## Directory Structure

```
/__tests__/
  /unit/
    /utils/
      html.test.ts
      errorHandling.test.ts
    /services/
      database.test.ts
      widget.test.ts
      backup.test.ts
      compression.test.ts
      settings.test.ts
    /hooks/
      useAutoSave.test.ts
      useBackgroundTaskPermissions.test.ts
  /integration/
    /services/
      database-widget-integration.test.ts
    /screens/
      today-screen.test.tsx
      calendar-screen.test.tsx
  /components/
    /atoms/
      LoadingSpinner.test.tsx
      ErrorMessage.test.tsx
    /molecules/
      CalendarGrid.test.tsx
      HistoryCard.test.tsx
    /organisms/
      RichTextEditor.test.tsx
/__mocks__/
  mockData.ts
  mockJournalEntries.ts
jest.config.js
jest.setup.js
```

## Configuration Files

### jest.config.js
```javascript
module.exports = {
  preset: 'jest-expo',
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|react-native-pell-rich-editor|react-native-webview|react-native-zip-archive)',
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/android/', '/ios/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  collectCoverageFrom: [
    'utils/**/*.{ts,tsx}',
    'services/**/*.{ts,tsx}',
    'hooks/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    'lib/**/*.{ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageThresholds: {
    global: {
      statements: 70,
      branches: 60,
      functions: 70,
      lines: 70,
    },
  },
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
};
```

### jest.setup.js
Creates comprehensive mocks for:
- AsyncStorage
- expo-sqlite (with mock database methods)
- expo-file-system
- expo-sharing
- expo-haptics
- react-native-zip-archive
- widget-manager module
- react-native-pell-rich-editor
- react-native-webview
- react-native-reanimated
- Alert and Platform APIs

### package.json Scripts
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage",
    "test:verbose": "jest --verbose",
    "test:unit": "jest __tests__/unit",
    "test:integration": "jest __tests__/integration",
    "test:components": "jest __tests__/components"
  }
}
```

## Test Breakdown by Priority

### PRIORITY 1: Pure Functions (Quick Wins)

#### utils/html.ts (5 functions)
**Tests:** `__tests__/unit/utils/html.test.ts`
- `htmlToPlainText`: 8 test cases (basic conversion, entity decoding, whitespace handling, edge cases)
- `countHtmlCharacters`: 4 test cases
- `truncateHtml`: 5 test cases
- `createTextPreview`: 3 test cases
- `isHtmlEmpty`: 6 test cases
- **Expected:** 100% coverage - pure functions, no dependencies

#### utils/errorHandling.ts
**Tests:** `__tests__/unit/utils/errorHandling.test.ts`
- `ApplicationError` class: constructor variations, property storage
- `normalizeError`: type conversion, default messages
- `logError`: console output verification
- `showErrorAlert`: Alert.alert calls, haptic feedback, callbacks
- `withErrorHandling`: function wrapping, error catching, options
- Error factory functions: 6 factories (database, filesystem, validation, etc.)
- `handleAsyncOperation`: loading states, success/error callbacks
- **Expected:** 90%+ coverage

### PRIORITY 2: Core Business Logic

#### services/database.ts
**Tests:** `__tests__/unit/services/database.test.ts`
- **Mock Mode Tests:**
  - `createEntry`: validation, duplicate date handling, mock data updates
  - `updateEntry`: ID validation, content updates, timestamp changes
  - `getEntryByDate`: existing/non-existent dates
  - `getAllEntries`: sorting, empty state
  - `getEntriesForMonth`: date filtering, month boundaries
  - `getHistoryForDate`: cross-year matching
  - `deleteEntry`: removal, ID validation
  - `getEntryCount`: counting accuracy
- **SQLite Mode Tests:**
  - Drizzle ORM integration
  - Database availability checks
  - Error handling when db is null
- **Expected:** 80%+ coverage (dual-mode architecture requires thorough testing)

#### services/widget.ts
**Tests:** `__tests__/unit/services/widget.test.ts`
- `htmlToPlainText`: HTML conversion with br tags
- `truncateText`: length limits
- `updateWidgetData`: with/without entry, widget reload, error handling
- `getWidgetData`: retrieval, validation, JSON parsing errors
- `appendToToday`: append vs create, timestamp formatting, HTML escaping
- `escapeHtml`: special character handling
- `getLastUpdate`: timestamp retrieval
- **Expected:** 80%+ coverage

#### services/backup.ts
**Tests:** `__tests__/unit/services/backup.test.ts`
- Backup creation (JSON export, file system operations)
- Restoration (JSON import, validation)
- Compression integration
- Platform-specific behavior (web vs mobile)
- Backup history retrieval
- Settings management
- **Expected:** 70%+ coverage

### PRIORITY 3: Complex Hooks

#### hooks/useAutoSave.ts
**Tests:** `__tests__/unit/hooks/useAutoSave.test.ts`
- Initialization with default values
- Debounce behavior (multiple changes → single save)
- `saveNow()` immediate save
- Canceling debounced save when `saveNow` called
- `isSaving` state management
- Callbacks: `onSaveStart`, `onSaveSuccess`, `onSaveError`
- Error handling and `clearError`
- Pending save queue when already saving
- `enabled` flag behavior
- Cleanup on unmount
- Using latest data in debounced save
- **Expected:** 80%+ coverage (complex timing logic)

### PRIORITY 4: Components

#### Atoms
- `LoadingSpinner.test.tsx`: rendering, size/color props, accessibility
- `ErrorMessage.test.tsx`: message display, retry button, callbacks, accessibility

#### Molecules
- `HistoryCard.test.tsx`: data rendering, press events, date formatting
- `CalendarGrid.test.tsx`: date cells, entry indicators, navigation

#### Organisms
- `RichTextEditor.test.tsx`:
  - Placeholder rendering
  - onChange callbacks
  - Character counting
  - Character limits and warnings
  - Save button states
  - Disabled state
  - Toolbar rendering
  - Ref methods (focus, getContentHtml)
- **Expected:** 70%+ coverage

### PRIORITY 5: Integration Tests

#### Database-Widget Integration
- Entry creation triggers widget update
- Entry update reflects in widget
- Widget append creates/updates entries
- Data consistency between services

#### Screen-Level Tests
- Today screen: load entry, empty state, auto-save, loading/error states
- Calendar screen: month navigation, entry indicators, date selection
- History screen: history entries, filtering

## Implementation Phases (Phased Approach)

### Phase 1: Foundation Setup ⭐ START HERE
**Goal:** Establish testing infrastructure and verify it works

**Files to Create:**
1. `jest.config.js` - Core Jest configuration
2. `jest.setup.js` - Mock infrastructure for all dependencies
3. `__mocks__/mockData.ts` - Shared mock data and fixtures
4. Update `package.json` - Add dependencies and test scripts

**Tasks:**
1. Run `npm install --save-dev @testing-library/react-native @testing-library/jest-native @testing-library/react-hooks jest jest-expo react-test-renderer @types/jest`
2. Create `jest.config.js` with Expo preset and transformIgnorePatterns
3. Create `jest.setup.js` with all necessary mocks (AsyncStorage, expo-sqlite, FileSystem, etc.)
4. Create `__mocks__/mockData.ts` with sample journal entries
5. Add test scripts to `package.json`
6. Verify setup by running `npm test` (should run with 0 tests)

**Validation Criteria:**
- ✅ `npm test` runs without errors
- ✅ All dependencies installed
- ✅ Mocks properly configured

**Estimated Time:** 1-2 hours

---

### Phase 2: Pure Functions (Quick Wins) ⭐ IMPLEMENT NEXT
**Goal:** Achieve first test coverage with easiest modules - establishes patterns

**Files to Create:**
1. `__tests__/unit/utils/html.test.ts` (~26 test cases)
2. `__tests__/unit/utils/errorHandling.test.ts` (~30 test cases)

**Expected Output:**
- ✅ All 56+ test cases passing
- ✅ 100% coverage on `utils/html.ts`
- ✅ 90%+ coverage on `utils/errorHandling.ts`
- ✅ Testing patterns established for rest of codebase
- ✅ Confidence in testing infrastructure

**Why Start Here:**
- Pure functions are easiest to test (no mocking required for html.ts)
- Quick wins build momentum
- Establishes naming conventions and patterns
- Validates test infrastructure works correctly

**Validation Criteria:**
- Run `npm run test:coverage` and verify coverage percentages
- All tests green
- No console errors or warnings

**Estimated Time:** 3-4 hours

---

### Phase 3: Core Services (Critical Business Logic)
**Goal:** Test the heart of the application - data persistence and widget integration

**Files to Create:**
1. `__tests__/unit/services/database.test.ts` (~35 test cases - both mock and SQLite modes)
2. `__tests__/unit/services/widget.test.ts` (~25 test cases)
3. `__tests__/unit/services/backup.test.ts` (~20 test cases)
4. `__tests__/unit/services/compression.test.ts` (~10 test cases)
5. `__tests__/unit/services/settings.test.ts` (~15 test cases)

**Expected Output:**
- ✅ 80%+ coverage on all service files
- ✅ Both mock and SQLite database modes tested
- ✅ Widget integration tested (with Expo Go graceful degradation)
- ✅ Backup/restore functionality validated
- ✅ Error handling verified across services

**Key Focus Areas:**
- **DatabaseService:** Dual-mode architecture testing is critical
- **WidgetService:** HTML to plain text conversion, AsyncStorage integration
- **BackupService:** File system operations, JSON serialization

**Validation Criteria:**
- Coverage report shows 80%+ on services/
- All CRUD operations tested
- Error scenarios covered

**Estimated Time:** 6-8 hours

---

### Phase 4: Hooks & Components
**Goal:** Test stateful logic and UI components

**Files to Create:**
1. `__tests__/unit/hooks/useAutoSave.test.ts` (~15 test cases - complex timing logic)
2. `__tests__/unit/hooks/useBackgroundTaskPermissions.test.ts` (~8 test cases)
3. `__tests__/components/atoms/LoadingSpinner.test.tsx` (~5 test cases)
4. `__tests__/components/atoms/ErrorMessage.test.tsx` (~7 test cases)
5. `__tests__/components/molecules/HistoryCard.test.tsx` (~8 test cases)
6. `__tests__/components/molecules/CalendarGrid.test.tsx` (~10 test cases)
7. `__tests__/components/organisms/RichTextEditor.test.tsx` (~15 test cases)

**Expected Output:**
- ✅ 80%+ coverage on hooks (complex state management)
- ✅ 70%+ coverage on components
- ✅ Debounce logic thoroughly tested (useAutoSave)
- ✅ Component rendering verified
- ✅ User interactions tested
- ✅ Accessibility validated

**Key Testing Patterns:**
- Use `jest.useFakeTimers()` for debounce testing in useAutoSave
- Use `@testing-library/react-hooks` for isolated hook testing
- Use `fireEvent` for user interactions
- Test component props and state changes

**Validation Criteria:**
- All hook edge cases covered (timing, cleanup, error states)
- Components render without errors
- User interactions trigger correct callbacks

**Estimated Time:** 6-8 hours

---

### Phase 5: Integration Tests & Polish
**Goal:** Validate that services work together correctly and achieve coverage targets

**Files to Create:**
1. `__tests__/integration/services/database-widget-integration.test.ts` (~8 test cases)
2. `__tests__/integration/screens/today-screen.test.tsx` (~6 test cases)
3. `__tests__/integration/screens/calendar-screen.test.tsx` (~5 test cases)
4. `__tests__/integration/screens/history-screen.test.tsx` (~4 test cases)

**Expected Output:**
- ✅ Service interactions validated (database ↔ widget)
- ✅ Screen-level tests passing
- ✅ User flows tested (create entry, auto-save, widget update)
- ✅ 70% global coverage threshold met
- ✅ All coverage targets achieved

**Integration Scenarios:**
- Creating entry triggers widget update
- Updating entry reflects in widget data
- Widget append creates new entry or updates existing
- Auto-save persists data correctly

**Final Validation:**
- Run `npm run test:coverage` - verify 70%+ global coverage
- Run `npm test` - all tests pass
- No flaky tests
- Clear test output with good descriptions

**Estimated Time:** 4-5 hours

---

### Total Implementation Time: 20-27 hours
Can be split across multiple sessions. Each phase is independently valuable.

## Testing Best Practices

### Naming Conventions
- Test files: `[filename].test.ts` or `[ComponentName].test.tsx`
- Describe blocks: `describe('FunctionName', () => {})`
- Test cases: `it('should [behavior] when [condition]', () => {})`

### Test Organization
```typescript
describe('ComponentName', () => {
  beforeEach(() => { /* setup */ });
  afterEach(() => { /* cleanup */ });

  describe('Feature Group', () => {
    it('test case 1', () => {});
    it('test case 2', () => {});
  });

  describe('Edge Cases', () => {
    it('handles null input', () => {});
  });

  describe('Error Handling', () => {
    it('throws on invalid input', () => {});
  });
});
```

### Coverage Targets
- **Utils:** 90%+ (pure functions, easy to test)
- **Services:** 80%+ (critical business logic)
- **Hooks:** 80%+ (complex state management)
- **Components:** 70%+ (UI complexity)
- **Global minimum:** 70% statements/functions, 60% branches

## Expected Test Counts by Module

- `html.test.ts`: ~26 test cases
- `errorHandling.test.ts`: ~30 test cases
- `database.test.ts`: ~35 test cases (covering both modes)
- `widget.test.ts`: ~25 test cases
- `backup.test.ts`: ~20 test cases
- `useAutoSave.test.ts`: ~15 test cases
- Component tests: ~40 test cases total
- Integration tests: ~15 test cases

**Total:** ~200+ test cases covering critical functionality

## Success Criteria

✅ All dependencies installed and configured
✅ Jest runs without errors
✅ 70%+ global code coverage achieved
✅ All critical services tested (database, widget, backup)
✅ Pure functions at 90%+ coverage
✅ Complex hooks thoroughly tested
✅ Key components rendering correctly
✅ Integration tests validate service interactions
✅ Tests run reliably in local development environment

## Key Implementation Notes

### Getting Started
1. **Start with Phase 1** - Don't skip the foundation setup. Proper mocking is critical.
2. **Run tests frequently** - Use `npm run test:watch` during development for instant feedback
3. **Check coverage often** - Run `npm run test:coverage` after each phase to track progress

### Testing Patterns
- **Pure functions first** - html.ts is perfect for establishing patterns
- **Mock mode before SQLite** - Database tests are easier in mock mode
- **Use fake timers** - Essential for testing useAutoSave debounce logic: `jest.useFakeTimers()`
- **Add testID props** - Add to components as needed for easier selection in tests

### Common Pitfalls to Avoid
- ❌ Don't mock what you're testing (only mock dependencies)
- ❌ Don't test implementation details (test behavior, not internals)
- ❌ Don't write brittle tests (avoid hard-coded timing, use waitFor)
- ✅ Do test error scenarios (they're often overlooked)
- ✅ Do test edge cases (null, undefined, empty strings)
- ✅ Do write descriptive test names

### When You're Stuck
- Review existing test files in the plan for reference patterns
- Run tests in verbose mode: `npm run test:verbose`
- Check mock setup in jest.setup.js
- Use `console.log` in tests to debug (remove before committing)

### Future Enhancements (Not in Scope)
- E2E testing with Detox
- CI/CD integration (GitHub Actions)
- Visual regression testing
- Performance testing
- Snapshot testing
