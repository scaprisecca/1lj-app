import * as schema from './schema';
import { Platform } from 'react-native';

// Initialize database connection
let db: any = null;
let isUsingMockDatabase = true; // Default to mock mode

// Initialize database with fallback-first approach
export async function initializeDatabase() {
  console.log('🔧 Initializing database...');
  
  // For Expo Go, always use mock mode
  if (Platform.OS !== 'web') {
    // Don't even try SQLite in this version - just use mock
    console.log('📱 Running in Expo Go - using mock database');
    isUsingMockDatabase = true;
    db = null;
    return null;
  }
  
  // Web fallback
  console.log('🌐 Web platform - using mock database');
  isUsingMockDatabase = true;
  db = null;
  return null;
}

// Check if we're using mock database
export function isUsingMock(): boolean {
  return isUsingMockDatabase;
}

// Safe database getter that handles both real and mock scenarios
export function getDatabase() {
  return db;
}