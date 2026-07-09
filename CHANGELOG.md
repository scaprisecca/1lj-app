# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Delete action for journal entries, with a destructive confirmation prompt, available from the entry detail screen
- Screen reader labels and roles on interactive controls throughout the app, plus larger tap targets on icon-only buttons
- Sticky formatting toolbar on Today tab that remains accessible above the keyboard while typing, eliminating the need to dismiss the keyboard to apply bold, italic, headings, and list formatting
- Support for appending multiple journal entries to the same day — subsequent saves now stack content with spacing instead of overwriting previous entries
- Auto-clearing editor after manual save to prompt users to write new entries, with existing daily content preserved as the base for appending
- Comprehensive test suite with Jest covering services, utilities, and components (228 passing tests with 49% coverage)
- Test infrastructure including jest.config.js, jest.setup.js, and mock data fixtures
- Unit tests for all critical business logic: database, backup, compression, settings, and widget services

### Fixed
- The unsaved-changes prompt on the entry detail screen now also appears when using the Android hardware/gesture back action, not just the in-app back button
- Relative date labels ("1 weeks ago", "1 months ago") now use correct singular grammar ("1 week ago", "1 month ago")
- Calendar "today" indicator now highlights correct date in all timezones (was off by one day in US timezones)
- Date headings now display correct day-of-week for all timezones
- Journal entries now file under correct local calendar date instead of UTC date
- Relative date labels (today/yesterday/X days ago) now calculate correctly
- Widget "Today" button now shows correct date in all regions
- Widget functionality now works gracefully in Expo Go without throwing "widget-manager not linked" errors. Widget updates are automatically skipped when running in development mode and fully enabled in production builds.
- SQLite migration error now resolves correctly during database initialization

### Changed
- Calendar days with entries now show a soft indigo highlight and a larger marker dot, making journaled days easier to spot at a glance
- Empty states (no entries, no search results, no entry for a date) now use a consistent layout with an icon and, where relevant, a one-tap action
- Loading indicators are now consistent across all screens, and the Settings loading spinner is properly centered
- The Today save button and its motivational line stay in place instead of shifting the layout — the button now shows a clearly disabled state, and the message fades in/out rather than popping
- Updated CLAUDE.md with widget support documentation explaining the difference between Expo Go and development builds

## [0.1.0] - 2025-11-29

### Added
- Initial project setup with React Native and Expo
- Rich text editor for journal entries
- Calendar view for browsing entries
- History view with filterable entries
- Home screen widget support (iOS 14+ and Android 6.0+)
- Backup and restore functionality
- Database persistence with Drizzle ORM and SQLite
- Loading states and TypeScript types for all components
- Comprehensive error handling for all features
