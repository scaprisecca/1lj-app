import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { History, Calendar, Search, X } from 'lucide-react-native';
import { HistoryCard } from '@/components/molecules/HistoryCard';
import { LoadingSpinner } from '@/components/atoms/LoadingSpinner';
import { ErrorMessage } from '@/components/atoms/ErrorMessage';
import { EmptyState } from '@/components/atoms/EmptyState';
import { DatabaseService } from '@/services/database';
import type { JournalEntry } from '@/lib/database/schema';
import { calculateStreak, getTodayString, formatDateString } from '@/lib/utils/date';
import { htmlToPlainText } from '@/utils/html';
import { fonts, radii, shadows, spacing, ThemeColors } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

const SEARCH_DEBOUNCE_MS = 200;

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const router = useRouter();
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [historyEntries, setHistoryEntries] = useState<JournalEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'history'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    loadEntries();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim().toLowerCase());
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

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

  const filteredEntries = useMemo(() => {
    if (!debouncedQuery) return entries;

    return entries.filter((entry) => {
      const plainText = htmlToPlainText(entry.html_body).toLowerCase();
      const dateText = formatDateString(entry.entry_date, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }).toLowerCase();
      return plainText.includes(debouncedQuery) || dateText.includes(debouncedQuery);
    });
  }, [entries, debouncedQuery]);

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <ErrorMessage message={error} onRetry={loadEntries} />
      </SafeAreaView>
    );
  }

  const listData = activeTab === 'all' ? filteredEntries : historyEntries;

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
          accessibilityRole="button"
          accessibilityLabel="All Entries"
          accessibilityState={{ selected: activeTab === 'all' }}
        >
          <Calendar size={16} color={activeTab === 'all' ? colors.white : colors.primary} />
          <Text style={[styles.tabText, activeTab === 'all' && styles.activeTabText]}>
            All Entries
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.activeTab]}
          onPress={() => setActiveTab('history')}
          accessibilityRole="button"
          accessibilityLabel="This Day"
          accessibilityState={{ selected: activeTab === 'history' }}
        >
          <History size={16} color={activeTab === 'history' ? colors.white : colors.primary} />
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>
            This Day
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'all' ? (
        <>
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

          <View style={styles.searchContainer}>
            <Search size={18} color={colors.textMuted} />
            <TextInput
              style={styles.searchInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search entries..."
              placeholderTextColor={colors.textMuted}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="Clear search"
              >
                <X size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        </>
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

    if (activeTab === 'all' && debouncedQuery) {
      return (
        <EmptyState
          icon={<Search size={28} color={colors.primary} />}
          title={`No entries match "${searchQuery.trim()}"`}
          subtitle="Try a different search term"
        />
      );
    }

    if (activeTab === 'all') {
      return (
        <EmptyState
          icon={<Calendar size={28} color={colors.primary} />}
          title="No journal entries yet"
          subtitle="Start writing to see your entries here"
          actionLabel="Write today's entry"
          onAction={() => router.push('/')}
        />
      );
    }

    return (
      <EmptyState
        icon={<History size={28} color={colors.primary} />}
        title="No history for this date"
        subtitle="Check back after writing more entries"
      />
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={colors.backgroundGradient} style={styles.gradient}>
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
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </LinearGradient>
    </SafeAreaView>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  gradient: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxxl,
  },
  header: {
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxxl,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 28,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.regular,
    fontSize: 16,
    color: colors.textSecondary,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.md,
    marginHorizontal: spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeTab: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tabText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  activeTabText: {
    color: colors.white,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: spacing.huge,
  },
  loadingText: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
    ...shadows.card,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: {
    flex: 1,
    fontFamily: fonts.regular,
    fontSize: 15,
    color: colors.text,
    marginLeft: 10,
  },
  statNumber: {
    fontFamily: fonts.bold,
    fontSize: 24,
    color: colors.primary,
  },
  statLabel: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  historyHeader: {
    paddingHorizontal: spacing.xxl,
    marginBottom: spacing.xxl,
  },
  historyTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 20,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  historySubtitle: {
    fontFamily: fonts.regular,
    fontSize: 14,
    color: colors.textSecondary,
  },
});
