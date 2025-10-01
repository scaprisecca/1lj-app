import { useState, useEffect } from 'react';
import { Platform, Alert, Linking } from 'react-native';
import * as BackgroundFetch from 'expo-background-fetch';
import { TaskManagerService } from '@/services/task-manager';

interface BackgroundTaskPermissions {
  status: BackgroundFetch.BackgroundFetchStatus | null;
  isLoading: boolean;
  isEnabled: boolean;
  statusText: string;
  requestPermission: () => Promise<void>;
}

/**
 * Custom hook for managing background task permissions
 * Checks background fetch status and provides methods to request permissions
 */
export function useBackgroundTaskPermissions(): BackgroundTaskPermissions {
  const [status, setStatus] = useState<BackgroundFetch.BackgroundFetchStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkPermissionStatus();
  }, []);

  const checkPermissionStatus = async () => {
    try {
      setIsLoading(true);
      const currentStatus = await TaskManagerService.getBackgroundFetchStatus();
      setStatus(currentStatus);
    } catch (error) {
      console.error('Error checking background task permissions:', error);
      setStatus(BackgroundFetch.BackgroundFetchStatus.Restricted);
    } finally {
      setIsLoading(false);
    }
  };

  const requestPermission = async () => {
    try {
      const currentStatus = await TaskManagerService.getBackgroundFetchStatus();

      if (currentStatus === BackgroundFetch.BackgroundFetchStatus.Denied) {
        Alert.alert(
          'Background Tasks Disabled',
          'Background tasks are currently disabled. To enable automatic backups, please go to your device settings and enable background app refresh for One Line Journal.',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => {
                if (Platform.OS === 'ios') {
                  Linking.openURL('app-settings:');
                } else {
                  Linking.openSettings();
                }
              },
            },
          ]
        );
        return;
      }

      if (currentStatus === BackgroundFetch.BackgroundFetchStatus.Restricted) {
        Alert.alert(
          'Background Tasks Restricted',
          'Background tasks are restricted on this device. Automatic backups may not work as expected.',
          [{ text: 'OK' }]
        );
        return;
      }

      // If available, permissions are already granted
      if (currentStatus === BackgroundFetch.BackgroundFetchStatus.Available) {
        setStatus(currentStatus);
        return;
      }
    } catch (error) {
      console.error('Error requesting background task permission:', error);
      Alert.alert('Error', 'Failed to check background task permissions.');
    }
  };

  const isEnabled = status === BackgroundFetch.BackgroundFetchStatus.Available;

  const statusText = (() => {
    switch (status) {
      case BackgroundFetch.BackgroundFetchStatus.Available:
        return 'Enabled';
      case BackgroundFetch.BackgroundFetchStatus.Denied:
        return 'Disabled';
      case BackgroundFetch.BackgroundFetchStatus.Restricted:
        return 'Restricted';
      default:
        return 'Unknown';
    }
  })();

  return {
    status,
    isLoading,
    isEnabled,
    statusText,
    requestPermission,
  };
}
