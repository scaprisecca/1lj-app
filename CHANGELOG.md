# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed
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
