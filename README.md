# One Line Journal

A React Native journaling app built with Expo. Write a quick daily entry with a rich text editor, browse past entries on a calendar or in a searchable history list, and keep your journal backed up — locally, on-demand, or automatically.

## Features

- **Rich text entries** — one entry per day, edited with a rich text editor (`react-native-pell-rich-editor`)
- **Calendar view** — jump to any day and see which days have entries
- **History** — scroll through past entries
- **Home screen widget** — view/append to today's entry from the widget (requires a development build; not available in Expo Go)
- **Backup & restore** — export your journal as JSON or a compressed `.zip`, optionally password-protected (AES-256), with automatic scheduled backups and restore support
- **Local-first storage** — entries are stored on-device in SQLite (Drizzle ORM)

## Tech Stack

- [Expo](https://expo.dev) SDK 54 (new architecture enabled) + React Native 0.81 / React 19
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- [Drizzle ORM](https://orm.drizzle.team/) over `expo-sqlite` for local storage
- [Inter](https://fonts.google.com/specimen/Inter) via `@expo-google-fonts/inter`
- [lucide-react-native](https://lucide.dev/) for icons

## Getting Started

### Prerequisites

- Node.js (LTS recommended)
- npm
- [Expo CLI](https://docs.expo.dev/more/expo-cli/) (invoked via `npx`, no global install needed)
- Xcode (for iOS builds/simulator) and/or Android Studio (for Android builds/emulator)

### Install dependencies

```bash
npm install
```

### Run the app

```bash
npm run dev              # Start the Expo development server
npm run android           # Run on a connected Android device/emulator
npm run ios               # Run on a connected iOS device/simulator
```

> **Note:** Some native features (home screen widgets) don't work in Expo Go and require a development build — see [Building with EAS](#building-with-eas) below.

### Database

The app uses Drizzle ORM with SQLite. Useful commands:

```bash
npx drizzle-kit generate    # Generate migration files after changing lib/database/schema.ts
npx drizzle-kit migrate     # Apply migrations
npx drizzle-kit studio      # Open Drizzle Studio to inspect the local database
```

### Tests & linting

```bash
npm test           # Run the unit test suite
npm run test:watch # Watch mode
npm run lint        # Run the Expo linter
```

## Project Structure

```
app/                  Expo Router screens (file-based routing)
  (tabs)/              Today, Calendar, History, Settings tabs
  entry/[date].tsx     Entry detail/edit screen
components/
  atoms/               Basic UI elements
  molecules/           Composite components (HistoryCard, CalendarGrid, ...)
  organisms/           Complex components (RichTextEditor, ...)
lib/database/          Drizzle schema, client, and migrations
services/              Business logic (database, backup, compression, widget, settings, ...)
modules/widget-manager/ Native widget module (iOS Swift / Android Kotlin)
```

See `CLAUDE.md` for more detailed architecture notes.

## Building with EAS

Production and internal test builds are done with [EAS Build](https://docs.expo.dev/build/introduction/). This repo already has an EAS project configured (see `eas.json` and the `extra.eas.projectId` in `app.json`).

### 1. Install and log in to EAS CLI

```bash
npm install -g eas-cli
eas login
```

### 2. Build profiles

Three profiles are defined in `eas.json`:

| Profile       | Purpose                                            | Android output |
|---------------|-----------------------------------------------------|-----------------|
| `development` | Dev client build with hot reload, internal install  | APK             |
| `preview`     | Internal test build (e.g. for TestFlight/ad-hoc)     | APK             |
| `production`  | Store-ready build                                    | App Bundle (AAB)|

### 3. Run a build

```bash
# Development build (needed to test native modules like the home screen widget)
eas build --profile development --platform android
eas build --profile development --platform ios

# Internal preview build
eas build --profile preview --platform android
eas build --profile preview --platform ios

# Production build for store submission
eas build --profile production --platform android
eas build --profile production --platform ios

# Build for both platforms at once
eas build --profile preview --platform all
```

The first iOS build will prompt you to configure credentials (or you can manage them ahead of time with `eas credentials`).

### 4. Install a development build

After a `development` profile build finishes, install it on your device/simulator, then start the dev server and connect the dev client to it:

```bash
npx expo start --dev-client
```

### 5. Submit to app stores

```bash
eas submit --platform android
eas submit --platform ios
```

`eas.json` currently has an empty `production` submit profile — fill in store credentials (or use `EXPO_APPLE_ID` / service account JSON, depending on platform) before submitting for the first time. See the [EAS Submit docs](https://docs.expo.dev/submit/introduction/) for platform-specific setup.

## Widgets

The app includes a native home screen widget (`modules/widget-manager/`, iOS Swift + Android Kotlin). Widgets are **not** available in Expo Go — you must run a development build (`eas build --profile development` or `npx expo run:ios` / `npx expo run:android`) to test them.
