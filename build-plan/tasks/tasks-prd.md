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

- `app/(tabs)/index.tsx` - **MODIFIED**: Updated to use RichTextEditor, new schema field names, and auto-save functionality
- `components/organisms/RichTextEditor.tsx` - **MODIFIED**: Rich text editor component with character counting, save button in toolbar, and save/blur callbacks
- `hooks/useAutoSave.ts` - **NEW**: Auto-save hook with debouncing, conflict handling, and error management
- `utils/html.ts` - **NEW**: HTML utility functions for text conversion and character counting
- `app/(tabs)/settings.tsx` - **NEW**: Complete settings screen per F-5 requirements
- `app/entry/[date].tsx` - **NEW**: Entry details screen for read-only view with edit capability
- `components/molecules/EntryDetails.tsx` - **NEW**: Read-only entry component with edit pencil
- `components/molecules/HistoryCard.tsx` - **MODIFIED**: Updated to use new schema and render HTML content with WebView
- `components/molecules/CalendarGrid.tsx` - **MODIFIED**: Updated to use new schema field names
- `services/database.ts` - **MODIFIED**: Updated to use new schema field names (entry_date, html_body) and handle HTML content
- `services/backup.ts` - **MODIFIED**: Updated to use new schema field names and maintain backward compatibility
- `lib/database/schema.ts` - **MODIFIED**: Updated to match PRD data model exactly (entry_date, html_body, file_uri, run_type, run_time, size_bytes)
- `widgets/` - **NEW**: Widget implementation directory structure
- `widgets/ios/` - **NEW**: iOS widget using WidgetKit
- `widgets/android/` - **NEW**: Android widget using AppWidget
- `services/widget.ts` - **NEW**: Widget data service
- `services/task-manager.ts` - **NEW**: Auto-backup scheduling service
- `hooks/useAutoSave.ts` - **NEW**: Auto-save functionality hook
- `hooks/useCharacterLimit.ts` - **NEW**: Character limit management hook
- `lib/database/migrations/` - **NEW**: Migration files for schema updates
- `package.json` - **MODIFIED**: Added react-native-pell-rich-editor dependency

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

- [ ] 4.0 Create Entry Details Screen
  - [ ] 4.1 Create entry/[date].tsx route for entry details
  - [ ] 4.2 Implement EntryDetails component with read-only view
  - [ ] 4.3 Add edit pencil button to switch to edit mode
  - [ ] 4.4 Connect calendar day taps to entry details navigation
  - [ ] 4.5 Handle navigation between read-only and edit modes
  - [ ] 4.6 Add proper back navigation and save flow

- [ ] 5.0 Implement Home Widgets
  - [ ] 5.1 Set up Expo target templates for widgets (npx create-target widget)
  - [ ] 5.2 Create iOS widget using WidgetKit framework
  - [ ] 5.3 Create Android widget using AppWidget framework
  - [ ] 5.4 Implement 1×1 widget layout showing today's entry (truncated)
  - [ ] 5.5 Add "+" button that opens inline text input
  - [ ] 5.6 Implement append functionality with timestamp (HH:mm format)
  - [ ] 5.7 Create widget data service for sharing data between app and widget

- [ ] 6.0 Build Complete Settings Screen
  - [ ] 6.1 Create settings.tsx screen with full F-5 functionality
  - [ ] 6.2 Add character limit configuration option
  - [ ] 6.3 Implement backup destination picker with expo-file-system integration
  - [ ] 6.4 Add Auto Backup settings (Off/Daily/Weekly options)
  - [ ] 6.5 Create "Export Now" functionality with compression
  - [ ] 6.6 Add settings persistence and validation

- [ ] 7.0 Implement Automatic Backup Scheduling
  - [ ] 7.1 Install and configure expo-task-manager dependency
  - [ ] 7.2 Create task-manager service for background tasks
  - [ ] 7.3 Implement periodic backup scheduling (daily/weekly)
  - [ ] 7.4 Handle background task registration and permissions
  - [ ] 7.5 Add backup failure handling and retry logic
  - [ ] 7.6 Create backup compression using expo-file-system

- [ ] 8.0 Update Data Model to Match PRD
  - [ ] 8.1 Review and update database schema to match PRD exactly
  - [ ] 8.2 Rename journal_entries fields to match PRD (entry_date, html_body)
  - [ ] 8.3 Update backup_logs schema to match PRD (file_uri, run_type, run_time, size_bytes)
  - [ ] 8.4 Create migration scripts for schema changes
  - [ ] 8.5 Update all service files to use new schema
  - [ ] 8.6 Test data migration and backward compatibility

- [ ] 9.0 Polish and Testing
  - [ ] 9.1 Add comprehensive error handling for all new features
  - [ ] 9.2 Implement loading states for all async operations
  - [ ] 9.3 Add proper TypeScript types for all new components
  - [ ] 9.4 Test widget functionality on both iOS and Android
  - [ ] 9.5 Test auto-backup scheduling and background tasks
  - [ ] 9.6 Verify rich text editor works correctly across platforms
  - [ ] 9.7 Test entry details navigation flow end-to-end 