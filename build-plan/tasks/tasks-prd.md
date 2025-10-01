# Task List: 1LJ App V1 Implementation

## Analysis Summary

After analyzing the codebase against the PRD requirements, the following major v1 features are **MISSING** and need implementation:

### ✅ **Implemented Features:**
- Basic journal entry creation/editing (Today screen) ✅
- Calendar view with month navigation and year picker ✅  
- History view with "This Day in Past" functionality ✅
- Basic backup/restore functionality with location settings ✅
- SQLite database with Drizzle ORM ✅
- Basic app navigation structure ✅

### ❌ **Missing Critical V1 Features:**
- **Rich Text Editor** (currently using plain TextInput instead of react-native-pell-rich-editor)
- **Home Widgets** (1×1 QuickAdd widget for Android & iOS)
- **Entry Details Screen** (read-only view with edit pencil from Calendar tap)
- **Auto-save functionality** (save on blur/toolbar save)
- **Complete Settings Screen** (F-5 from PRD)
- **Automatic backup scheduling** via expo-task-manager
- **Data model compliance** (schema doesn't match PRD exactly)

---

## Relevant Files

- `app/(tabs)/index.tsx` - **MODIFIED**: Updated to use RichTextEditor, new schema field names, auto-save functionality, and widget data updates
- `app/(tabs)/calendar.tsx` - **MODIFIED**: Updated to navigate to entry details screen when day is tapped and entry exists
- `components/organisms/RichTextEditor.tsx` - **MODIFIED**: Rich text editor component with character counting, save button in toolbar, and save/blur callbacks
- `hooks/useAutoSave.ts` - **NEW**: Auto-save hook with debouncing, conflict handling, and error management
- `utils/html.ts` - **NEW**: HTML utility functions for text conversion and character counting
- `app/(tabs)/settings.tsx` - **NEW**: Complete settings screen with character limit, backup destination, auto-backup frequency, and export functionality
- `app/(tabs)/_layout.tsx` - **MODIFIED**: Added settings tab with Settings icon
- `services/settings.ts` - **NEW**: Settings persistence service with validation and formatting utilities
- `app/entry/[date].tsx` - **MODIFIED**: Entry details screen with read-only view, edit mode toggle, full CRUD functionality, and widget data updates
- `components/molecules/HistoryCard.tsx` - **MODIFIED**: Updated to use new schema and render HTML content with WebView
- `components/molecules/CalendarGrid.tsx` - **MODIFIED**: Updated to use new schema field names
- `services/database.ts` - **MODIFIED**: Updated to use new schema field names (entry_date, html_body) and handle HTML content
- `services/backup.ts` - **MODIFIED**: Updated to use new schema field names and maintain backward compatibility
- `lib/database/schema.ts` - **MODIFIED**: Updated to match PRD data model exactly (entry_date, html_body, file_uri, run_type, run_time, size_bytes)
- `widgets/` - **NEW**: Widget implementation directory structure
- `widgets/ios/` - **NEW**: iOS widget using WidgetKit with SwiftUI
- `widgets/ios/OneLineJournalWidget.swift` - **NEW**: iOS widget implementation with timeline provider and widget view
- `widgets/ios/Info.plist` - **NEW**: iOS widget extension configuration
- `widgets/android/` - **NEW**: Android widget using AppWidget framework
- `widgets/android/src/main/java/com/onelinejournal/widget/JournalWidgetProvider.kt` - **NEW**: Android widget provider implementation
- `widgets/android/src/main/res/layout/journal_widget.xml` - **NEW**: Android widget layout
- `widgets/android/src/main/res/xml/journal_widget_info.xml` - **NEW**: Android widget configuration
- `widgets/android/src/main/res/drawable/widget_background.xml` - **NEW**: Widget background gradient drawable
- `widgets/android/src/main/res/drawable/ic_add_circle.xml` - **NEW**: Add button icon drawable
- `widgets/android/src/main/res/values/strings.xml` - **NEW**: Widget strings
- `widgets/android/src/main/AndroidManifest.xml` - **NEW**: Android widget manifest
- `widgets/android/build.gradle` - **NEW**: Android widget build configuration
- `widgets/README.md` - **NEW**: Comprehensive widget setup and usage documentation
- `widgets/TESTING_GUIDE.md` - **NEW**: Comprehensive widget testing guide with procedures for iOS and Android platforms
- `BACKUP_TESTING_GUIDE.md` - **NEW**: Comprehensive auto-backup and background tasks testing guide with platform-specific procedures
- `RICH_TEXT_EDITOR_TESTING_GUIDE.md` - **NEW**: Comprehensive rich text editor testing guide with formatting, character limits, and cross-platform tests
- `NAVIGATION_TESTING_GUIDE.md` - **NEW**: End-to-end navigation flow testing guide for entry details from Calendar and History tabs
- `services/widget.ts` - **NEW**: Widget data service for managing data between app and widgets
- `modules/widget-manager/` - **NEW**: Native module for widget refresh functionality
- `modules/widget-manager/index.ts` - **NEW**: TypeScript interface for widget manager
- `modules/widget-manager/ios/WidgetManager.swift` - **NEW**: iOS native module implementation
- `modules/widget-manager/ios/WidgetManager.m` - **NEW**: iOS bridge file
- `modules/widget-manager/android/WidgetManagerModule.kt` - **NEW**: Android native module implementation
- `modules/widget-manager/android/WidgetManagerPackage.kt` - **NEW**: Android package registration
- `services/task-manager.ts` - **NEW**: Auto-backup scheduling service with retry logic and background task management
- `services/compression.ts` - **NEW**: Compression service for ZIP backup files
- `hooks/useBackgroundTaskPermissions.ts` - **NEW**: Hook for managing background task permissions
- `hooks/useCharacterLimit.ts` - **NEW**: Character limit management hook
- `lib/database/migrations/` - **NEW**: Migration files for schema updates
- `lib/database/migrations/data-migration.ts` - **NEW**: Data migration utilities for converting old schema field names to PRD-compliant names with backward compatibility
- `lib/database/migrations/MIGRATION_GUIDE.md` - **NEW**: Comprehensive guide for database migrations and backward compatibility
- `drizzle/` - **NEW**: Drizzle ORM migration files directory
- `drizzle/0000_flashy_dagger.sql` - **NEW**: Initial schema migration with PRD-compliant table structure
- `drizzle/migrations.js` - **NEW**: Expo SQLite migration loader for Drizzle ORM
- `lib/database/client.ts` - **MODIFIED**: Added runMigrations function for applying Drizzle migrations
- `app/_layout.tsx` - **MODIFIED**: Initialize background backup task on app start and run database migrations
- `app/(tabs)/settings.tsx` - **MODIFIED**: Integrate task manager and display background task status
- `app.json` - **MODIFIED**: Added expo-task-manager plugin with Android boot permission
- `services/backup.ts` - **MODIFIED**: Added compression support for backups with ZIP format
- `package.json` - **MODIFIED**: Added react-native-pell-rich-editor, react-native-render-html, expo-task-manager, expo-background-fetch, and react-native-zip-archive dependencies
- `utils/errorHandling.ts` - **NEW**: Comprehensive error handling utilities with standardized error types, logging, and user-friendly alerts
- `components/organisms/RichTextEditor.tsx` - **MODIFIED**: Added try-catch blocks for all imperative handle methods and event handlers
- `services/widget.ts` - **MODIFIED**: Enhanced error handling with validation, proper logging, and error wrapping
- `services/database.ts` - **MODIFIED**: Added input validation, comprehensive error handling, and detailed error messages
- `app/entry/[date].tsx` - **MODIFIED**: Integrated error handling utilities with user-friendly error alerts and retry capabilities
- `app/(tabs)/index.tsx` - **MODIFIED**: Enhanced loading state with ActivityIndicator and improved error handling; added explicit TypeScript types for all state variables
- `app/(tabs)/history.tsx` - **MODIFIED**: Added loading states for backup and restore operations with disabled buttons and ActivityIndicators
- `app/(tabs)/settings.tsx` - **MODIFIED**: Added loading state for auto-backup frequency updates with visual feedback and haptics
- `components/organisms/RichTextEditor.tsx` - **MODIFIED**: Replaced `any` type with proper `ViewStyle` type for style prop
- `hooks/useAutoSave.ts` - **MODIFIED**: Made generic with proper type parameter `<T>` instead of using `any` for data
- `services/backup.ts` - **MODIFIED**: Added `SharingModule` interface to replace `any` type for expo-sharing
- `app/entry/[date].tsx` - **MODIFIED**: Added explicit TypeScript types for all state variables including `JournalEntry | null`
- `services/task-manager.ts` - **MODIFIED**: Imported and used `TaskStatus` type from centralized types file
- `types/index.ts` - **NEW**: Created centralized type definitions file with commonly used interfaces and types

### Notes

- Rich text editor needs to store HTML strings as specified in PRD
- Widgets need platform-specific implementations using Expo target templates
- Auto-backup needs expo-task-manager for periodic scheduling
- Entry details screen should be accessible from calendar day taps

## Tasks

- [x] 1.0 Implement Rich Text Editor
  - [x] 1.1 Install and configure react-native-pell-rich-editor dependency
  - [x] 1.2 Create RichTextEditor component with WYSIWYG functionality
  - [x] 1.3 Replace plain TextInput on Today screen with RichTextEditor
  - [x] 1.4 Update database schema to store HTML content instead of plain text
  - [x] 1.5 Implement HTML-to-display conversion for existing screens
  - [x] 1.6 Add character count functionality that works with HTML content

- [x] 3.0 Implement Auto-Save Functionality
  - [x] 3.1 Create useAutoSave hook for automatic saving
  - [x] 3.2 Implement save-on-blur functionality for text editor
  - [x] 3.3 Add toolbar Save button with manual save capability
  - [x] 3.4 Add saving indicators and feedback
  - [x] 3.5 Handle auto-save conflicts and error scenarios

- [x] 4.0 Create Entry Details Screen
  - [x] 4.1 Create entry/[date].tsx route for entry details
  - [x] 4.2 Implement EntryDetails component with read-only view
  - [x] 4.3 Add edit pencil button to switch to edit mode
  - [x] 4.4 Connect calendar day taps to entry details navigation
  - [x] 4.5 Handle navigation between read-only and edit modes
  - [x] 4.6 Add proper back navigation and save flow

- [x] 5.0 Implement Home Widgets
  - [x] 5.1 Set up Expo target templates for widgets (npx create-target widget)
  - [x] 5.2 Create iOS widget using WidgetKit framework
  - [x] 5.3 Create Android widget using AppWidget framework
  - [x] 5.4 Implement 1×1 widget layout showing today's entry (truncated)
  - [x] 5.5 Add "+" button that opens inline text input
  - [x] 5.6 Implement append functionality with timestamp (HH:mm format)
  - [x] 5.7 Create widget data service for sharing data between app and widget

- [x] 6.0 Build Complete Settings Screen
  - [x] 6.1 Create settings.tsx screen with full F-5 functionality
  - [x] 6.2 Add character limit configuration option
  - [x] 6.3 Implement backup destination picker with expo-file-system integration
  - [x] 6.4 Add Auto Backup settings (Off/Daily/Weekly options)
  - [x] 6.5 Create "Export Now" functionality with compression
  - [x] 6.6 Add settings persistence and validation

- [x] 7.0 Implement Automatic Backup Scheduling
  - [x] 7.1 Install and configure expo-task-manager dependency
  - [x] 7.2 Create task-manager service for background tasks
  - [x] 7.3 Implement periodic backup scheduling (daily/weekly)
  - [x] 7.4 Handle background task registration and permissions
  - [x] 7.5 Add backup failure handling and retry logic
  - [x] 7.6 Create backup compression using expo-file-system

- [x] 8.0 Update Data Model to Match PRD
  - [x] 8.1 Review and update database schema to match PRD exactly
  - [x] 8.2 Rename journal_entries fields to match PRD (entry_date, html_body)
  - [x] 8.3 Update backup_logs schema to match PRD (file_uri, run_type, run_time, size_bytes)
  - [x] 8.4 Create migration scripts for schema changes
  - [x] 8.5 Update all service files to use new schema
  - [x] 8.6 Test data migration and backward compatibility

- [x] 9.0 Polish and Testing
  - [x] 9.1 Add comprehensive error handling for all new features
  - [x] 9.2 Implement loading states for all async operations
  - [x] 9.3 Add proper TypeScript types for all new components
  - [x] 9.4 Test widget functionality on both iOS and Android
  - [x] 9.5 Test auto-backup scheduling and background tasks
  - [x] 9.6 Verify rich text editor works correctly across platforms
  - [x] 9.7 Test entry details navigation flow end-to-end 