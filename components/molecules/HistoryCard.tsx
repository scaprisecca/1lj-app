import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Edit3 } from 'lucide-react-native';
import type { JournalEntry } from '@/lib/database/schema';
import { formatDateString, formatRelativeDate, getTodayString, parseDateString } from '@/lib/utils/date';
import { htmlToPlainText } from '@/utils/html';
import { fonts, radii, shadows, spacing, ThemeColors } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

interface HistoryCardProps {
  entry: JournalEntry;
  onPress?: () => void;
  showDate?: boolean;
}

export function HistoryCard({ entry, onPress, showDate = true }: HistoryCardProps) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const formatDate = (dateString: string) => {
    return formatDateString(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const isRecent = (dateString: string) => {
    const diffDays = Math.floor(
      (parseDateString(getTodayString()).getTime() - parseDateString(dateString).getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays <= 1;
  };

  const showAbsoluteDate = showDate && !isRecent(entry.entry_date);

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Entry for ${formatDate(entry.entry_date)}`}
    >
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={colors.primary} />
          {showAbsoluteDate && (
            <Text style={styles.dateText}>{formatDate(entry.entry_date)}</Text>
          )}
          <Text style={[styles.relativeText, !showAbsoluteDate && styles.relativeTextPrimary]}>
            {showAbsoluteDate ? `(${formatRelativeDate(entry.entry_date)})` : formatRelativeDate(entry.entry_date)}
          </Text>
        </View>
        {onPress && <Edit3 size={16} color={colors.textMuted} />}
      </View>
      
      <View style={styles.contentContainer}>
        <Text style={styles.previewText} numberOfLines={3}>
          {htmlToPlainText(entry.html_body)}
        </Text>
      </View>
      
      {entry.updated_at !== entry.created_at && (
        <Text style={styles.updatedText}>
          Last updated: {new Date(entry.updated_at).toLocaleDateString()}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.xxl,
    marginBottom: spacing.md,
    ...shadows.subtle,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  relativeText: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: colors.textMuted,
    marginLeft: spacing.xs,
  },
  relativeTextPrimary: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: colors.text,
    marginLeft: spacing.sm,
  },
  contentContainer: {
    marginBottom: spacing.sm,
  },
  previewText: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textBody,
  },
  updatedText: {
    fontFamily: fonts.regular,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});