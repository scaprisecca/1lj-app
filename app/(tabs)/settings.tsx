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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect, useMemo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Download,
  Upload,
  Clock,
  Type,
  ChevronRight,
  Check,
  Lock,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system/legacy';
import * as DocumentPicker from 'expo-document-picker';
import { BackupService } from '@/services/backup';
import { CompressionService } from '@/services/compression';
import { SettingsService, type AutoBackupFrequency, type AppSettings } from '@/services/settings';
import { DatabaseService } from '@/services/database';
import { TaskManagerService } from '@/services/task-manager';
import { useBackgroundTaskPermissions } from '@/hooks/useBackgroundTaskPermissions';
import { useToast } from '@/components/atoms/Toast';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { fonts, radii, shadows, spacing, ThemeColors } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

export default function SettingsScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [settings, setSettings] = useState<AppSettings>({
    characterLimit: 280,
    autoBackupFrequency: 'off',
    lastBackupTime: null,
    backupLocation: 'documents',
    backupCompress: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isUpdatingFrequency, setIsUpdatingFrequency] = useState(false);
  const [characterLimitInput, setCharacterLimitInput] = useState('280');
  const [exportPassword, setExportPassword] = useState('');
  const [restorePasswordModalVisible, setRestorePasswordModalVisible] = useState(false);
  const [restorePassword, setRestorePassword] = useState('');
  const [pendingRestoreUri, setPendingRestoreUri] = useState<string | null>(null);
  const backgroundPermissions = useBackgroundTaskPermissions();
  const { showToast } = useToast();

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

  const handleAutoBackupFrequencyChange = async (frequency: AutoBackupFrequency) => {
    try {
      setIsUpdatingFrequency(true);

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      // Check background task permissions before enabling
      if (frequency !== 'off' && !backgroundPermissions.isEnabled) {
        const granted = await backgroundPermissions.requestPermission();
        if (!granted) {
          return; // User denied or restricted, don't enable
        }
      }

      // Update the setting and register/unregister the background task
      await TaskManagerService.updateBackupFrequency(frequency);
      setSettings({ ...settings, autoBackupFrequency: frequency });

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

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
    } finally {
      setIsUpdatingFrequency(false);
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

      // Create backup - a non-empty password produces an AES-256 encrypted zip
      const password = exportPassword.trim();
      const backupUri = await BackupService.createBackup(undefined, password || undefined);

      if (backupUri) {
        // Update last backup time
        await SettingsService.updateLastBackupTime();
        const updatedSettings = await SettingsService.loadSettings();
        setSettings(updatedSettings);

        if (Platform.OS !== 'web') {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        showToast(
          password
            ? `Exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} (encrypted)`
            : `Exported ${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
        );
      }
    } catch (error) {
      console.error('Error exporting:', error);
      Alert.alert('Export Failed', 'Failed to export your journal entries.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Backup',
      'Select a backup file to restore your journal entries. Existing entries won\'t be overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose File', onPress: selectRestoreFile }
      ]
    );
  };

  const selectRestoreFile = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
              const content = e.target?.result as string;
              processRestoreFile(content);
            };
            reader.readAsText(file);
          }
        };
        input.click();
      } else {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['application/json', 'application/zip'],
          copyToCacheDirectory: true
        });

        if (!result.canceled && result.assets[0]) {
          const uri = result.assets[0].uri;
          if (CompressionService.isCompressed(uri)) {
            // Compressed backups are binary - restoreFromBackup decompresses
            // the file itself, so pass the path rather than reading it as text.
            if (await CompressionService.isPasswordProtected(uri)) {
              setPendingRestoreUri(uri);
              setRestorePassword('');
              setRestorePasswordModalVisible(true);
            } else {
              processRestoreFile('', true, uri);
            }
          } else {
            const fileContent = await FileSystem.readAsStringAsync(uri);
            processRestoreFile(fileContent);
          }
        }
      }
    } catch (error) {
      console.error('Error selecting restore file:', error);
      Alert.alert('Error', 'Failed to select restore file');
    }
  };

  const processRestoreFile = async (
    content: string,
    isCompressed: boolean = false,
    filePath?: string,
    password?: string
  ) => {
    try {
      setIsRestoring(true);
      await BackupService.restoreFromBackup(content, isCompressed, filePath, password);

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showToast('Backup restored successfully');
    } catch (error) {
      console.error('Error restoring backup:', error);
      const message = error instanceof Error ? error.message : '';
      Alert.alert(
        'Error',
        message === 'Incorrect password. Please try again.'
          ? message
          : 'Failed to restore backup. Please check the file format.'
      );
    } finally {
      setIsRestoring(false);
    }
  };

  const handleRestorePasswordConfirm = () => {
    if (!pendingRestoreUri) return;
    const uri = pendingRestoreUri;
    const password = restorePassword;
    setRestorePasswordModalVisible(false);
    setPendingRestoreUri(null);
    setRestorePassword('');
    processRestoreFile('', true, uri, password);
  };

  const handleRestorePasswordCancel = () => {
    setRestorePasswordModalVisible(false);
    setPendingRestoreUri(null);
    setRestorePassword('');
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
        <View style={styles.loadingContainer}>
          <LoadingSpinner size={32} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Header — matches the left-aligned pattern used by Calendar/History */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Settings</Text>
          <Text style={styles.headerSubtitle}>Customize your journal experience</Text>
        </View>

        {/* Editor Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Editor</Text>

          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Type size={20} color={colors.primary} />
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
              {isSaving && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </View>
        </View>

        {/* Backup Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Backup & Export</Text>

          {/* Auto Backup Frequency */}
          <View style={styles.settingCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Clock size={20} color={colors.primary} />
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
                    isUpdatingFrequency && styles.frequencyOptionDisabled,
                  ]}
                  onPress={() => handleAutoBackupFrequencyChange(frequency)}
                  activeOpacity={0.7}
                  disabled={isUpdatingFrequency}
                  accessibilityRole="button"
                  accessibilityLabel={`Auto backup ${getBackupFrequencyLabel(frequency)}`}
                  accessibilityState={{ selected: settings.autoBackupFrequency === frequency }}
                >
                  {isUpdatingFrequency && settings.autoBackupFrequency !== frequency ? (
                    <ActivityIndicator size="small" color={colors.textMuted} />
                  ) : (
                    <>
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
                        <Check size={16} color={colors.white} />
                      )}
                    </>
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
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel="Enable background tasks"
                  >
                    <Text style={styles.statusButtonText}>Enable</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {/* Export password (optional) */}
          {Platform.OS !== 'web' && (
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingIconContainer}>
                  <Lock size={20} color={colors.primary} />
                </View>
                <View style={styles.settingContent}>
                  <Text style={styles.settingLabel}>Backup Password</Text>
                  <Text style={styles.settingDescription}>
                    Optional - encrypts your export. You'll need this password to restore it.
                  </Text>
                </View>
              </View>
              <TextInput
                style={styles.passwordInput}
                value={exportPassword}
                onChangeText={setExportPassword}
                placeholder="Leave blank for no encryption"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                editable={!isExporting}
              />
            </View>
          )}

          {/* Export Now */}
          <TouchableOpacity
            style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
            onPress={handleExportNow}
            disabled={isExporting}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Export now"
            accessibilityState={{ disabled: isExporting }}
          >
            <LinearGradient
              colors={isExporting ? [colors.textMuted, colors.textMuted] : colors.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.exportButtonGradient}
            >
              {isExporting ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Download size={20} color={colors.white} />
              )}
              <Text style={styles.exportButtonText}>
                {isExporting ? 'Exporting...' : 'Export Now'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Restore from Backup */}
          <TouchableOpacity
            style={[styles.settingCard, isRestoring && styles.settingCardDisabled]}
            onPress={handleRestore}
            disabled={isRestoring}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Restore from backup"
            accessibilityState={{ disabled: isRestoring }}
          >
            <View style={styles.settingRow}>
              <View style={styles.settingIconContainer}>
                <Upload size={20} color={colors.primary} />
              </View>
              <View style={styles.settingContent}>
                <Text style={styles.settingLabel}>Restore from Backup</Text>
                <Text style={styles.settingDescription}>
                  Import entries from a backup file
                </Text>
              </View>
              {isRestoring ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <ChevronRight size={20} color={colors.textMuted} />
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.appInfo}>
          <Text style={styles.appInfoText}>One Line Journal v1.0.0</Text>
          <Text style={styles.appInfoText}>Made with ❤️ for journaling</Text>
        </View>
      </ScrollView>

      {/* Restore password prompt for encrypted backups */}
      <Modal
        visible={restorePasswordModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleRestorePasswordCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Password Required</Text>
            <Text style={styles.settingDescription}>
              This backup is encrypted. Enter the password to restore it.
            </Text>
            <TextInput
              style={styles.passwordInput}
              value={restorePassword}
              onChangeText={setRestorePassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={styles.modalButtonCancel}
                onPress={handleRestorePasswordCancel}
                accessibilityRole="button"
                accessibilityLabel="Cancel"
              >
                <Text style={styles.modalButtonCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButtonPrimary, !restorePassword && styles.exportButtonDisabled]}
                onPress={handleRestorePasswordConfirm}
                disabled={!restorePassword}
                accessibilityRole="button"
                accessibilityLabel="Restore"
              >
                <Text style={styles.modalButtonPrimaryText}>Restore</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: fonts.bold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs,
  },
  settingCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadows.compact,
  },
  settingCardDisabled: {
    opacity: 0.6,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.indigoTint,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingContent: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  characterLimitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
    backgroundColor: colors.background,
  },
  frequencyOptions: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  frequencyOptionActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  frequencyOptionText: {
    fontSize: 14,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  frequencyOptionTextActive: {
    color: colors.white,
  },
  frequencyOptionDisabled: {
    opacity: 0.5,
  },
  lastBackupText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  backgroundTaskStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radii.md,
    gap: spacing.sm,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusIndicatorActive: {
    backgroundColor: colors.success,
  },
  statusIndicatorInactive: {
    backgroundColor: colors.danger,
  },
  statusText: {
    flex: 1,
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
  },
  statusButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: radii.sm + 2,
  },
  statusButtonText: {
    fontSize: 12,
    fontFamily: fonts.medium,
    color: colors.white,
  },
  exportButton: {
    marginTop: spacing.sm,
    borderRadius: radii.lg,
    overflow: 'hidden',
    ...shadows.button,
  },
  exportButtonDisabled: {
    opacity: 0.7,
  },
  exportButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
  },
  exportButtonText: {
    fontSize: 16,
    fontFamily: fonts.semiBold,
    color: colors.white,
  },
  appInfo: {
    alignItems: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  appInfoText: {
    fontSize: 12,
    fontFamily: fonts.regular,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  passwordInput: {
    height: 48,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    fontSize: 16,
    fontFamily: fonts.medium,
    color: colors.text,
    backgroundColor: colors.background,
    marginTop: spacing.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.xl,
    ...shadows.compact,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: fonts.semiBold,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  modalButtonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButtonCancel: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
  },
  modalButtonCancelText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.textSecondary,
  },
  modalButtonPrimary: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
  },
  modalButtonPrimaryText: {
    fontSize: 15,
    fontFamily: fonts.medium,
    color: colors.white,
  },
});
