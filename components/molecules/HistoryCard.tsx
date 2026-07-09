import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Calendar, Edit3 } from 'lucide-react-native';
import type { JournalEntry } from '@/lib/database/schema';
import { formatDateString, parseDateString } from '@/lib/utils/date';
import { htmlToPlainText } from '@/utils/html';
import { colors, fonts, radii, shadows, spacing } from '@/lib/theme';

interface HistoryCardProps {
  entry: JournalEntry;
  onPress?: () => void;
  showDate?: boolean;
}

export function HistoryCard({ entry, onPress, showDate = true }: HistoryCardProps) {
  const formatDate = (dateString: string) => {
    return formatDateString(dateString, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };
  
  const formatRelativeDate = (dateString: string) => {
    const date = parseDateString(dateString);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress} disabled={!onPress}>
      <View style={styles.header}>
        <View style={styles.dateContainer}>
          <Calendar size={16} color={colors.primary} />
          {showDate && (
            <Text style={styles.dateText}>{formatDate(entry.entry_date)}</Text>
          )}
          <Text style={styles.relativeText}>({formatRelativeDate(entry.entry_date)})</Text>
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

const styles = StyleSheet.create({
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