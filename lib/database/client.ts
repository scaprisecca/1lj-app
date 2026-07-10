import * as schema from './schema';
import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';

// Initialize database connection
let db: any = null;
let isUsingMockDatabase = true; // Default to mock mode

// Initialize database with fallback-first approach
export async function initializeDatabase() {
  console.log('🔧 Initializing database...');

  if (Platform.OS === 'web') {
    console.log('🌐 Web platform - using mock database');
    isUsingMockDatabase = true;
    db = null;
    return null;
  }

  // Native platform - try real SQLite
  try {
    const { openDatabaseSync } = require('expo-sqlite');
    const { drizzle } = require('drizzle-orm/expo-sqlite');

    const sqliteDb = openDatabaseSync('journal.db');
    db = drizzle(sqliteDb, { schema });
    isUsingMockDatabase = false;
    console.log('✅ SQLite database initialized');
    return db;
  } catch (error) {
    // Mock fallback is only acceptable in dev / Expo Go, where real SQLite
    // isn't available. In a production build this must surface as a hard
    // failure — silently switching to mock data means the user's entries
    // are never persisted.
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (__DEV__ || isExpoGo) {
      console.warn('⚠️ SQLite unavailable (Expo Go?), falling back to mock:', error);
      isUsingMockDatabase = true;
      db = null;
      return null;
    }

    console.error('❌ SQLite unavailable in production build:', error);
    throw error;
  }
}

// Run migrations when SQLite is enabled
// NOTE: This will be used when app moves from Expo Go to production build
export async function runMigrations() {
  if (isUsingMockDatabase || !db) {
    console.log('⏭️  Skipping migrations - using mock database');
    return;
  }

  try {
    console.log('🔄 Running database migrations...');

    // Import migrations
    const migrations = require('../../drizzle/migrations');
    const { migrate } = require('drizzle-orm/expo-sqlite/migrator');

    await migrate(db, migrations);
    console.log('✅ Migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

// Check if we're using mock database
export function isUsingMock(): boolean {
  return isUsingMockDatabase;
}

// Safe database getter that handles both real and mock scenarios
export function getDatabase() {
  return db;
}