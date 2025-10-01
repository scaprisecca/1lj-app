import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { History, Calendar, Download, Upload, Settings, FolderOpen, X, HardDrive, Share } from 'lucide-react-native';
import { HistoryCard } from '@/components/molecules/HistoryCard';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { DatabaseService } from '@/services/database';
import { BackupService } from '@/services/backup';
import type { JournalEntry } from '@/lib/database/schema';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Backup location options
type BackupLocation = 'documents' | 'custom' | 'share';

interface BackupSettings {
  location: BackupLocation;
  customPath?: string;
  autoBackup: boolean;
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'history'>('all');
  const [showBackupSettings, setShowBackupSettings] = useState(false);
  const [backupSettings, setBackupSettings] = useState<BackupSettings>({
    location: 'documents',
    autoBackup: true
  });

  useEffect(() => {
    loadEntries();
    loadBackupSettings();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryForToday();
    }
  }, [activeTab]);

  const loadBackupSettings = async () => {
    try {
      const settings = await AsyncStorage.getItem('backupSettings');
      if (settings) {
        setBackupSettings(JSON.parse(settings));
      }
    } catch (error) {
      console.error('Error loading backup settings:', error);
    }
  };

  const saveBackupSettings = async (settings: BackupSettings) => {
    try {
      await AsyncStorage.setItem('backupSettings', JSON.stringify(settings));
      setBackupSettings(settings);
    } catch (error) {
      console.error('Error saving backup settings:', error);
      Alert.alert('Error', 'Failed to save backup settings');
    }
  };

  const loadEntries = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const allEntries = await DatabaseService.getAllEntries();
      setEntries(allEntries);
    } catch (err) {
      setError('Failed to load journal entries');
    } finally {
      setIsLoading(false);
    }
  };

  const loadHistoryForToday = async () => {
    try {
      const today = new Date();
      const monthDay = `${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;
      const history = await DatabaseService.getHistoryForDate(monthDay);
      setHistoryEntries(history);
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadEntries();
    if (activeTab === 'history') {
      await loadHistoryForToday();
    }
    setIsRefreshing(false);
  };

  const selectCustomBackupLocation = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert('Info', 'Custom location selection is not available on web. Backups will be saved to your Downloads folder.');
        return;
      }

      // For mobile, we'll show the available options since direct folder picking is limited
      Alert.alert(
        'Backup Location',
        'Choose where to save your backups:',
        [
          {
            text: 'App Documents',
            onPress: () => {
              const updatedSettings = { ...backupSettings, location: 'documents' as BackupLocation, customPath: undefined };
              saveBackupSettings(updatedSettings);
            }
          },
          {
            text: 'Share Each Time',
            onPress: () => {
              const updatedSettings = { ...backupSettings, location: 'share' as BackupLocation, customPath: undefined };
              saveBackupSettings(updatedSettings);
            }
          },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } catch (error) {
      console.error('Error selecting backup location:', error);
      Alert.alert('Error', 'Failed to select backup location');
    }
  };

  const handleBackup = async () => {
    try {
      setIsBackingUp(true);

      if (Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }

      await BackupService.createBackup('manual');

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', `Backup created successfully!\n\nLocation: ${getBackupLocationText()}`);
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Error', 'Failed to create backup. Please try again.');
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleRestore = () => {
    Alert.alert(
      'Restore Backup',
      'Select a backup file to restore your journal entries.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Choose File', onPress: selectRestoreFile }
      ]
    );
  };

  const selectRestoreFile = async () => {
    try {
      if (Platform.OS === 'web') {
        // Create a file input for web
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
        // Mobile file picker
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true
        });

        if (!result.canceled && result.assets[0]) {
          const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
          processRestoreFile(fileContent);
        }
      }
    } catch (error) {
      console.error('Error selecting restore file:', error);
      Alert.alert('Error', 'Failed to select restore file');
    }
  };

  const processRestoreFile = async (content: string) => {
    try {
      setIsRestoring(true);
      await BackupService.restoreFromBackup(content);
      await loadEntries(); // Refresh the entries

      if (Platform.OS !== 'web') {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert('Success', 'Backup restored successfully!');
    } catch (error) {
      console.error('Error restoring backup:', error);
      Alert.alert('Error', 'Failed to restore backup. Please check the file format.');
    } finally {
      setIsRestoring(false);
    }
  };

  const getBackupLocationText = () => {
    switch (backupSettings.location) {
      case 'documents':
        return Platform.OS === 'web' ? 'Downloads folder' : 'App Documents folder';
      case 'share':
        return 'System share dialog';
      case 'custom':
        return backupSettings.customPath || 'Custom location';
      default:
        return 'Default location';
    }
  };

  const formatMonthDay = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  const BackupSettingsModal = () => (
    <Modal
      visible={showBackupSettings}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowBackupSettings(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Backup Settings</Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setShowBackupSettings(false)}
            >
              <X size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalBody}>
            <Text style={styles.sectionTitle}>Backup Location</Text>
            <Text style={styles.sectionDescription}>
              Choose where your backup files will be saved
            </Text>
            
            {/* Backup Location Options */}
            <TouchableOpacity
              style={[styles.optionItem, backupSettings.location === 'documents' && styles.optionItemSelected]}
              onPress={() => saveBackupSettings({ ...backupSettings, location: 'documents', customPath: undefined })}
            >
              <HardDrive size={20} color={backupSettings.location === 'documents' ? '#6366F1' : '#64748B'} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, backupSettings.location === 'documents' && styles.optionTitleSelected]}>
                  App Documents
                </Text>
                <Text style={styles.optionDescription}>
                  {Platform.OS === 'web' ? 'Downloads folder' : 'App\'s document folder'}
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.optionItem, backupSettings.location === 'share' && styles.optionItemSelected]}
              onPress={() => saveBackupSettings({ ...backupSettings, location: 'share', customPath: undefined })}
            >
              <Share size={20} color={backupSettings.location === 'share' ? '#6366F1' : '#64748B'} />
              <View style={styles.optionText}>
                <Text style={[styles.optionTitle, backupSettings.location === 'share' && styles.optionTitleSelected]}>
                  Share Each Time
                </Text>
                <Text style={styles.optionDescription}>
                  Choose where to save for each backup
                </Text>
              </View>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={[styles.optionItem, backupSettings.location === 'custom' && styles.optionItemSelected]}
                onPress={selectCustomBackupLocation}
              >
                <FolderOpen size={20} color={backupSettings.location === 'custom' ? '#6366F1' : '#64748B'} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, backupSettings.location === 'custom' && styles.optionTitleSelected]}>
                    Custom Location
                  </Text>
                  <Text style={styles.optionDescription}>
                    {backupSettings.customPath || 'Choose a custom folder'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.currentLocationInfo}>
              <Text style={styles.currentLocationLabel}>Current backup location:</Text>
              <Text style={styles.currentLocationText}>{getBackupLocationText()}</Text>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage message={error} onRetry={loadEntries} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.gradient}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>History</Text>
          <Text style={styles.subtitle}>Explore your journal journey</Text>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'all' && styles.activeTab]}
            onPress={() => setActiveTab('all')}
          >
            <Calendar size={16} color={activeTab === 'all' ? 'white' : '#6366F1'} />
            <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
              All Entries
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, activeTab === 'history' && styles.activeTab]}
            onPress={() => setActiveTab('history')}
          >
            <History size={16} color={activeTab === 'history' ? 'white' : '#6366F1'} />
            <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
              This Day
            </Text>
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={['#6366F1']}
              tintColor="#6366F1"
            />
          }
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={32} />
              <Text style={styles.loadingText}>Loading entries...</Text>
            </View>
          ) : (
            <>
              {activeTab === 'all' ? (
                <>
                  {/* Stats */}
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{entries.length}</Text>
                      <Text style={styles.statLabel}>Total Entries</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>
                        {entries.length > 0 ? Math.floor((Date.now() - new Date(entries[entries.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)) : 0}
                      </Text>
                      <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                  </View>

                  {/* All Entries */}
                  {entries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No journal entries yet</Text>
                      <Text style={styles.emptySubtext}>Start writing to see your entries here</Text>
                    </View>
                  ) : (
                    entries.map((entry) => (
                      <HistoryCard
                        key={entry.id}
                        entry={entry}
                        onPress={() => console.log('Edit entry:', entry.id)}
                      />
                    ))
                  )}
                </>
              ) : (
                <>
                  {/* This Day in History */}
                  <View style={styles.historyHeader}>
                    <Text style={styles.historyTitle}>On {formatMonthDay()}</Text>
                    <Text style={styles.historySubtitle}>
                      {historyEntries.length} entries from previous years
                    </Text>
                  </View>

                  {historyEntries.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Text style={styles.emptyText}>No history for this date</Text>
                      <Text style={styles.emptySubtext}>Check back after writing more entries</Text>
                    </View>
                  ) : (
                    historyEntries.map((entry) => (
                      <HistoryCard
                        key={entry.id}
                        entry={entry}
                        onPress={() => console.log('View historical entry:', entry.id)}
                      />
                    ))
                  )}
                </>
              )}
            </>
          )}
        </ScrollView>

        {/* Backup Actions */}
        <View style={styles.backupContainer}>
          <TouchableOpacity
            style={[styles.backupButton, (isBackingUp || isRestoring) && styles.backupButtonDisabled]}
            onPress={handleBackup}
            disabled={isBackingUp || isRestoring}
          >
            {isBackingUp ? (
              <>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.backupButtonText}>Backing up...</Text>
              </>
            ) : (
              <>
                <Download size={16} color="#6366F1" />
                <Text style={styles.backupButtonText}>Backup</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backupButton, (isBackingUp || isRestoring) && styles.backupButtonDisabled]}
            onPress={handleRestore}
            disabled={isBackingUp || isRestoring}
          >
            {isRestoring ? (
              <>
                <ActivityIndicator size="small" color="#6366F1" />
                <Text style={styles.backupButtonText}>Restoring...</Text>
              </>
            ) : (
              <>
                <Upload size={16} color="#6366F1" />
                <Text style={styles.backupButtonText}>Restore</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.backupButton, (isBackingUp || isRestoring) && styles.backupButtonDisabled]}
            onPress={() => setShowBackupSettings(true)}
            disabled={isBackingUp || isRestoring}
          >
            <Settings size={16} color="#6366F1" />
            <Text style={styles.backupButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <BackupSettingsModal />
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  gradient: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontFamily: 'Inter-Bold',
    fontSize: 28,
    color: '#1E293B',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 16,
    color: '#64748B',
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginHorizontal: 4,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeTab: {
    backgroundColor: '#6366F1',
    borderColor: '#6366F1',
  },
  tabText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 8,
  },
  activeTabText: {
    color: 'white',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
    marginTop: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 24,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontFamily: 'Inter-Bold',
    fontSize: 24,
    color: '#6366F1',
  },
  statLabel: {
    fontFamily: 'Inter-Regular',
    fontSize: 12,
    color: '#64748B',
    marginTop: 4,
  },
  historyHeader: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  historyTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 4,
  },
  historySubtitle: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#94A3B8',
    marginBottom: 8,
  },
  emptySubtext: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#CBD5E1',
    textAlign: 'center',
  },
  backupContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  backupButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: 'white',
    borderRadius: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#6366F1',
  },
  backupButtonText: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 8,
  },
  backupButtonDisabled: {
    opacity: 0.5,
  },
  // New: Modal styles for backup settings
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 18,
    color: '#1E293B',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 8,
  },
  sectionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F1F5F9',
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  optionItemSelected: {
    borderColor: '#6366F1',
    backgroundColor: '#F0F7FF',
  },
  optionText: {
    flex: 1,
    marginLeft: 12,
  },
  optionTitle: {
    fontFamily: 'Inter-Medium',
    fontSize: 16,
    color: '#1E293B',
    marginBottom: 2,
  },
  optionTitleSelected: {
    color: '#6366F1',
  },
  optionDescription: {
    fontFamily: 'Inter-Regular',
    fontSize: 14,
    color: '#64748B',
  },
  currentLocationInfo: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#6366F1',
  },
  currentLocationLabel: {
    fontFamily: 'Inter-Medium',
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
  },
  currentLocationText: {
    fontFamily: 'Inter-SemiBold',
    fontSize: 16,
    color: '#1E293B',
  },
});