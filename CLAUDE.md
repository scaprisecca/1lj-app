# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

One Line Journal - A React Native journaling app built with Expo that allows users to write daily journal entries with a rich text editor. The app supports calendar views, history tracking, and backup functionality.

## Development Commands

### Running the App
```bash
npm run dev              # Start Expo development server (telemetry disabled)
npm run android          # Run on Android device/emulator
npm run ios              # Run on iOS device/simulator
```

### Building & Quality
```bash
npm run build:web        # Export for web platform
npm run lint             # Run Expo linter
```

### Database
```bash
npx drizzle-kit generate    # Generate migration files
npx drizzle-kit migrate     # Apply migrations
npx drizzle-kit studio      # Open Drizzle Studio for database inspection
```

## Architecture

### Database Layer
- **ORM**: Drizzle ORM with SQLite (`expo-sqlite`)
- **Schema Location**: `lib/database/schema.ts`
- **Database Client**: `lib/database/client.ts`
- **Mock Mode**: Currently runs in mock mode for Expo Go compatibility - the database client returns null and services fall back to in-memory mock data
- **Service Layer**: `services/database.ts` provides `DatabaseService` class with methods that handle both real SQLite and mock mode transparently

### Navigation
- **Router**: Expo Router (file-based routing)
- **Typed Routes**: Enabled in `app.json` for type-safe navigation
- **Layout Structure**:
  - Root: `app/_layout.tsx` - handles font loading, database initialization, splash screen
  - Tab Navigation: `app/(tabs)/_layout.tsx` - three tabs (Today, Calendar, History)
  - Screens: `app/(tabs)/index.tsx`, `calendar.tsx`, `history.tsx`

### Component Architecture
Follows Atomic Design principles:
- **Atoms**: `components/atoms/` - Basic UI elements (LoadingSpinner, ErrorMessage)
- **Molecules**: `components/molecules/` - Composite components (HistoryCard, CalendarGrid)
- **Organisms**: `components/organisms/` - Complex components (RichTextEditor)

### Path Aliases
- `@/*` maps to project root (e.g., `@/lib/database/client`)

### Key Technologies
- **React Native**: 0.79.1 with React 19
- **Expo SDK**: 53.0.0 with new architecture enabled
- **Database**: Drizzle ORM + expo-sqlite
- **Rich Text**: react-native-pell-rich-editor
- **Icons**: lucide-react-native
- **Fonts**: Inter (loaded via @expo-google-fonts/inter)
- **Storage**: @react-native-async-storage/async-storage for app data

### Database Schema
Two main tables defined in `lib/database/schema.ts`:

1. **journal_entries**
   - `id`: Primary key (auto-increment)
   - `entry_date`: YYYY-MM-DD format (unique)
   - `html_body`: HTML content from rich text editor
   - `created_at`, `updated_at`: Timestamps

2. **backup_logs**
   - `id`: Primary key
   - `file_uri`: Backup file location
   - `run_type`: 'auto' | 'manual'
   - `run_time`: Timestamp
   - `size_bytes`: File size
   - `status`: 'success' | 'failed'

### Important Development Notes

1. **Database Mock Mode**: The app currently uses mock data instead of real SQLite when running in Expo Go. The `DatabaseService` class automatically handles both modes.

2. **Font Loading**: App waits for Inter fonts to load before rendering. Custom font families available: `Inter-Regular`, `Inter-Medium`, `Inter-SemiBold`, `Inter-Bold`.

3. **Splash Screen**: Manually controlled in `app/_layout.tsx` - hidden only after fonts and database are ready.

4. **Code Style**: Follow the Expo best practices defined in `.cursor/rules/expo-rule.mdc`:
   - Use functional components (no classes)
   - TypeScript with strict mode
   - Interfaces over types
   - Avoid enums (use union types)
   - Descriptive variable names with auxiliary verbs

5. **Cursor Rules**: Development guidelines are stored in `.cursor/rules/` directory. All rule files use `.mdc` extension and follow a specific frontmatter format.
