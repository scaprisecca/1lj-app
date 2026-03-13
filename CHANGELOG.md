# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Sticky formatting toolbar on Today tab that remains accessible above the keyboard while typing, eliminating the need to dismiss the keyboard to apply bold, italic, headings, and list formatting
- Support for appending multiple journal entries to the same day — subsequent saves now stack content with spacing instead of overwriting previous entries
- Auto-clearing editor after manual save to prompt users to write new entries, with existing daily content preserved as the base for appending
- Comprehensive test suite with Jest covering services, utilities, and components (228 passing tests with 49% coverage)
- Test infrastructure including jest.config.js, jest.setup.js, and mock data fixtures
- Unit tests for all critical business logic: database, backup, compression, settings, and widget services

### Fixed
- Calendar "today" indicator now highlights correct date in all timezones (was off by one day in US timezones)
- Date headings now display correct day-of-week for all timezones
- Journal entries now file under correct local calendar date instead of UTC date
- Relative date labels (today/yesterday/X days ago) now calculate correctly
- Widget "Today" button now shows correct date in all regions
- Widget functionality now works gracefully in Expo Go without throwing "widget-manager not linked" errors. Widget updates are automatically skipped when running in development mode and fully enabled in production builds.
- SQLite migration error now resolves correctly during database initialization

### Changed
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
