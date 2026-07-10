import { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useFonts } from 'expo-font';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { SplashScreen } from 'expo-router';
import { initializeDatabase, runMigrations } from '@/lib/database/client';
import { DataMigration } from '@/lib/database/migrations/data-migration';
import { TaskManagerService } from '@/services/task-manager';
import { SettingsService } from '@/services/settings';
import { ToastProvider } from '@/components/atoms/Toast';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Define the background task before the component renders
TaskManagerService.defineBackupTask();

export default function RootLayout() {
  useFrameworkReady();
  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<string | null>(null);

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    // Initialize database when app starts
    initializeDatabase()
      .then(async () => {
        // Run schema migrations
        await runMigrations();

        // Run data migration (converts old field names to new PRD-compliant names)
        await DataMigration.runAll();

        setDatabaseReady(true);
        console.log('Database initialized successfully');
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
        setDatabaseError(error.message);
        // In dev, continue without a database (mock mode already handled
        // this in initializeDatabase). In production, initializeDatabase
        // rethrows instead of falling back to mock, so reaching this branch
        // there means storage is genuinely unavailable — do not set
        // databaseReady, so the blocking error screen renders instead.
        if (__DEV__) {
          setDatabaseReady(true);
        }
      });
  }, []);

  useEffect(() => {
    // Initialize background backup task when database is ready
    if (databaseReady) {
      SettingsService.getSetting('autoBackupFrequency')
        .then((frequency) => {
          if (frequency !== 'off') {
            TaskManagerService.registerBackupTask(frequency)
              .then(() => {
                console.log('Background backup task registered successfully');
              })
              .catch((error) => {
                console.error('Failed to register background backup task:', error);
              });
          }
        })
        .catch((error) => {
          console.error('Failed to load auto-backup settings:', error);
        });
    }
  }, [databaseReady]);

  useEffect(() => {
    if ((fontsLoaded || fontError) && (databaseReady || databaseError)) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, databaseReady, databaseError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!databaseReady && !databaseError) {
    return null;
  }

  // Production init/migration failure with no mock fallback: storage is
  // genuinely unavailable, so block the app instead of pretending saves work.
  if (databaseError && !databaseReady) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Storage unavailable</Text>
        <Text style={styles.errorMessage}>
          Your journal entries can&apos;t be saved right now. Please restart the app.
          If this keeps happening, reinstalling may help.
        </Text>
      </View>
    );
  }

  // Show warning for database issues but continue to app (dev only)
  if (databaseError) {
    console.warn('App running without database:', databaseError);
  }

  return (
    <ToastProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ToastProvider>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#1a1a1a',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 15,
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 22,
  },
});