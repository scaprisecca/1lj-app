import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Settings as SettingsIcon,
  Download,
  FolderOpen,
  Clock,
  Type,
  ChevronRight,
  Check,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { BackupService } from '@/services/backup';
import { SettingsService, type AutoBackupFrequency, type AppSettings } from '@/services/settings';
import { DatabaseService } from '@/services/database';
import { TaskManagerService } from '@/services/task-manager';
import { useBackgroundTaskPermissions } from '@/hooks/useBackgroundTaskPermissions';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>({
    characterLimit: 280,
    backupDestination: null,
    autoBackupFrequency: 'off',
    lastBackupTime: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [characterLimitInput, setCharacterLimitInput] = useState('280');
  const backgroundPermissions = useBackgroundTaskPermissions();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const loadedSettings = await SettingsService.loadSettings();
      setSettings(loadedSettings);
      setCharacterLimitInput(loadedSettings.characterLimit.toString());
    } catch (error) {
      console.error('Error loading settings:', error);
      Alert.alert('Error', 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCharacterLimitChange = async () => {
    const newLimit = parseInt(characterLimitInput, 10);

    if (isNaN(newLimit)) {
      Alert.alert('Invalid Input', 'Please enter a valid number');
      setCharacterLimitInput(settings.characterLimit.toString());
      return;
    }

    if (!SettingsService.validateCharacterLimit(newLimit)) {
      Alert.alert(
        'Invalid Limit',
        'Character limit must be between 100 and 10,000'
      );
      setCharacterLimitInput(settings.characterLimit.toString());
      return;
    }

    try {
      setIsSaving(true);
      await SettingsService.updateSetting('characterLimit', newLimit);
      setSettings({ ...settings, characterLimit: newLimit });

      if (Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      console.error('Error updating character limit:', error);
      Alert.alert('Error', 'Failed to update character limit');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackupDestinationPicker = async () => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // On mobile, use DocumentPicker to select a directory
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: false,
      });

      if (result.canceled) {
        return;
      }

      // Extract directory path from the selected file
      const uri = result.assets[0].uri;
      const dirPath = uri.substring(0, uri.lastIndexOf('/'));

      await SettingsService.updateSetting('backupDestination', dirPath);
      setSettings({ ...settings, backupDestination: dirPath });

      Alert.alert('Success', 'Backup destination updated');
    } catch (error) {
      console.error('Error selecting backup destination:', error);
      Alert.alert('Error', 'Failed to select backup destination');
    }
  };

  const handleAutoBackupFrequencyChange = async (frequency: AutoBackupFrequency) => {
    try {
      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Check background task permissions before enabling
      if (frequency !== 'off' && !backgroundPermissions.isEnabled) {
        await backgroundPermissions.requestPermission();
        // Re-check permission status after request
        if (!backgroundPermissions.isEnabled) {
          return; // User denied or restricted, don't enable
        }
      }

      // Update the setting and register/unregister the background task
      await TaskManagerService.updateBackupFrequency(frequency);
      setSettings({ ...settings, autoBackupFrequency: frequency });

      if (frequency !== 'off') {
        Alert.alert(
          'Auto Backup Enabled',
          `Your journal will be backed up automatically ${frequency}.`
        );
      } else {
        Alert.alert(
          'Auto Backup Disabled',
          'Automatic backups have been turned off.'
        );
      }
    } catch (error) {
      console.error('Error updating auto backup frequency:', error);
      Alert.alert('Error', 'Failed to update auto backup settings');
    }
  };

  const handleExportNow = async () => {
    try {
      setIsExporting(true);

      if (Platform.OS !== 'web') {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Get all entries
      const entries = await DatabaseService.getAllEntries();

      if (entries.length === 0) {
        Alert.alert('No Entries', 'You have no journal entries to export.');
        return;
      }

      // Create backup
      const backupUri = await BackupService.createBackup();

      if (backupUri) {
        // Update last backup time
        await SettingsService.updateLastBackupTime();
        const updatedSettings = await SettingsService.loadSettings();
        setSettings(updatedSettings);

        Alert.alert(
          'Export Complete',
          `Successfully exported ${entries.length} journal ${entries.length === 1 ? 'entry' : 'entries'}.\n\nBackup saved to: ${backupUri}`,
          [
            {
              text: 'OK',
              onPress: () => {
                if (Platform.OS !== 'web') {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Export Failed', 'Failed to export your journal entries.');
    } finally {
      setIsExporting(false);
    }
  };

  const getBackupFrequencyLabel = (frequency: AutoBackupFrequency): string => {
    switch (frequency) {
      case 'off':
        return 'Off';
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return 'Off';
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#6366F1" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.header}
        >
          <SettingsIcon size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your journal experience</Text>
        </LinearGradient>

        {/* Editor Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Editor</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Type size={20} color="#6366F1" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Character Limit</Text>
                <Text style={styles.settingDescription}>
                  Maximum characters per entry (100-10,000)
                </Text>
              </View>
            </View>
            <View style={styles.characterLimitInput}>
              <TextInput
                style={styles.input}
                value={characterLimitInput}
                onChangeText={setCharacterLimitInput}
                onBlur={handleCharacterLimitChange}
                keyboardType="number-pad"
                maxLength={5}
                editable={!isSaving}
              />
              {isSaving && <ActivityIndicator size="small" color="#6366F1" />}
            </View>
          </View>
        </View>

        {/* Backup Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Export</Text>

          {/* Backup Destination */}
          <TouchableOpacity
            style={styles.settingCard}
            onPress={handleBackupDestinationPicker}
            activeOpacity={0.7}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <FolderOpen size={20} color="#6366F1" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Backup Destination</Text>
                <Text style={styles.settingDescription} numberOfLines={1}>
                  {settings.backupDestination || 'Default location'}
                </Text>
              </View>
              <ChevronRight size={20} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          {/* Auto Backup Frequency */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Clock size={20} color="#6366F1" />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Auto Backup</Text>
                <Text style={styles.settingDescription}>
                  Automatically backup your journal
                </Text>
              </View>
            </View>

            <View style={styles.frequencyOptions}>
              {(['off', 'daily', 'weekly'] as AutoBackupFrequency[]).map((frequency) => (
                <TouchableOpacity
                  key={frequency}
                  style={[
                    styles.frequencyOption,
                    settings.autoBackupFrequency === frequency && styles.frequencyOptionActive,
                  ]}
                  onPress={() => handleAutoBackupFrequencyChange(frequency)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.frequencyOptionText,
                      settings.autoBackupFrequency === frequency &&
                        styles.frequencyOptionTextActive,
                    ]}
                  >
                    {getBackupFrequencyLabel(frequency)}
                  </Text>
                  {settings.autoBackupFrequency === frequency && (
                    <Check size={16} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            {settings.lastBackupTime && (
              <Text style={styles.lastBackupText}>
                Last backup: {SettingsService.formatLastBackupTime(settings.lastBackupTime)}
              </Text>
            )}

            {/* Background Task Status */}
            {settings.autoBackupFrequency !== 'off' && (
              <View style={styles.backgroundTaskStatus}>
                <View
                  style={[
                    styles.statusIndicator,
                    backgroundPermissions.isEnabled
                      ? styles.statusIndicatorActive
                      : styles.statusIndicatorInactive,
                  ]}
                />
                <Text style={styles.statusText}>
                  Background tasks: {backgroundPermissions.statusText}
                </Text>
                {!backgroundPermissions.isEnabled && (
                  <TouchableOpacity
                    onPress={backgroundPermissions.requestPermission}
                    style={styles.statusButton}
                  >
                    <Text style={styles.statusButtonText}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Export Now */}
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExportNow}
            disabled={isExporting}
            activeOpacity={0.7}
          >
            <LinearGradient
              colors={isExporting ? ['#94A3B8', '#94A3B8'] : ['#667eea', '#764ba2']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exportButtonGradient}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Download size={20} color="#FFFFFF" />
              )}
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Export Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>One Line Journal v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️ for journaling</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    color: '#FFFFFF',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    color: '#FFFFFF',
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#1E293B',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  characterLimitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  frequencyOptions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  frequencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    gap: 4,
  },
  frequencyOptionActive: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  frequencyOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    color: '#64748B',
  },
  frequencyOptionTextActive: {
    color: '#FFFFFF',
  },
  lastBackupText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
    marginTop: 12,
    textAlign: 'center',
  },
  backgroundTaskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 8,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusIndicatorActive: {
    backgroundColor: '#10B981',
  },
  statusIndicatorInactive: {
    backgroundColor: '#EF4444',
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#64748B',
  },
  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#6366F1',
    borderRadius: 6,
  },
  statusButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    color: '#FFFFFF',
  },
  exportButton: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    color: '#FFFFFF',
  },
  appInfo: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    color: '#94A3B8',
    marginBottom: 4,
  },
});
