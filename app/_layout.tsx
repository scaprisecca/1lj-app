import { useEffect, useState } from 'react';
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
import { initializeDatabase } from '@/lib/database/client';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

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
      .then(() => {
        setDatabaseReady(true);
        console.log('Database initialized successfully');
      })
      .catch((error) => {
        console.error('Database initialization failed:', error);
        setDatabaseError(error.message);
        // For development purposes, we'll continue without database
        setDatabaseReady(true);
      });
  }, []);

  useEffect(() => {
    if ((fontsLoaded || fontError) && databaseReady) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError, databaseReady]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  if (!databaseReady) {
    return null;
  }

  // Show warning for database issues but continue to app
  if (databaseError) {
    console.warn('App running without database:', databaseError);
  }

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}