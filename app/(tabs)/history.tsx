import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { History, Calendar } from 'lucide-react-native';
import { HistoryCard } from '@/components/molecules/HistoryCard';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { DatabaseService } from '@/services/database';
import type { JournalEntry } from '@/lib/database/schema';
import { calculateStreak, getTodayString } from '@/lib/utils/date';

export default function HistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'history'>('all');

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistoryForToday();
    }
  }, [activeTab]);

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

  const formatMonthDay = () => {
    const today = new Date();
    return today.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric'
    });
  };

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage message={error} onRetry={loadEntries} />
      </SafeAreaView>
    );
  }

  const listData = activeTab === 'all' ? entries : historyEntries;

  const renderHeader = () => (
    <>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
        <Text style={styles.subtitle}>Explore your journal journey</Text>
      </View>

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

      {activeTab === 'all' ? (
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{entries.length}</Text>
            <Text style={styles.statLabel}>Total Entries</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>
              {calculateStreak(entries.map((entry) => entry.entry_date), getTodayString())}
            </Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
      ) : (
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>On {formatMonthDay()}</Text>
          <Text style={styles.historySubtitle}>
            {historyEntries.length} entries from previous years
          </Text>
        </View>
      )}
    </>
  );

  const renderEmpty = () => {
    if (isLoading) return null;

    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>
          {activeTab === 'all' ? 'No journal entries yet' : 'No history for this date'}
        </Text>
        <Text style={styles.emptySubtext}>
          {activeTab === 'all'
            ? 'Start writing to see your entries here'
            : 'Check back after writing more entries'}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={['#F8FAFC', '#F1F5F9']} style={styles.gradient}>
        {isLoading ? (
          <>
            {renderHeader()}
            <View style={styles.loadingContainer}>
              <LoadingSpinner size={32} />
              <Text style={styles.loadingText}>Loading entries...</Text>
            </View>
          </>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(entry) => entry.id.toString()}
            renderItem={({ item }) => (
              <HistoryCard
                entry={item}
                onPress={() => router.push(`/entry/${item.entry_date}`)}
              />
            )}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                colors={['#6366F1']}
                tintColor="#6366F1"
              />
            }
          />
        )}
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
  listContent: {
    paddingBottom: 32,
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
});
