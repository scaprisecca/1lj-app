import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect, useMemo } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { countHtmlCharacters, isHtmlEmpty } from '@/utils/html';
import { Save } from 'lucide-react-native';
import { fonts, radii, shadows, spacing, ThemeColors } from '@/lib/theme';
import { useTheme } from '@/hooks/useTheme';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  onSave?: () => void;
  placeholder?: string;
  disabled?: boolean;
  style?: ViewStyle;
  showCharacterCount?: boolean;
  characterLimit?: number;
  onCharacterCountChange?: (count: number) => void;
  showSaveButton?: boolean;
  saveDisabled?: boolean;
  isSaving?: boolean;
  editorRef?: React.RefObject<RichEditor>;
  showToolbar?: boolean;
}

export interface RichTextEditorRef {
  focus: () => void;
  blur: () => void;
  getContentHtml: () => Promise<string>;
  setContentHTML: (html: string) => void;
}

export const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(
  ({
    value = '',
    onChange,
    onBlur,
    onSave,
    placeholder,
    disabled = false,
    style,
    showCharacterCount = false,
    characterLimit,
    onCharacterCountChange,
    showSaveButton = false,
    saveDisabled = false,
    isSaving = false,
    editorRef,
    showToolbar = true,
  }, ref) => {
    const { colors } = useTheme();
    const styles = useMemo(() => createStyles(colors), [colors]);
    const editorStyle = useMemo(() => createEditorStyle(colors), [colors]);
    const internalRef = useRef<RichEditor>(null);
    const richTextRef = editorRef ?? internalRef;
    const [characterCount, setCharacterCount] = useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => {
        try {
          richTextRef.current?.focusContentEditor();
        } catch (error) {
          console.error('[RichTextEditor] Error focusing editor:', error);
        }
      },
      blur: () => {
        try {
          richTextRef.current?.blurContentEditor();
        } catch (error) {
          console.error('[RichTextEditor] Error blurring editor:', error);
        }
      },
      getContentHtml: async () => {
        try {
          return await richTextRef.current?.getContentHtml() || '';
        } catch (error) {
          console.error('[RichTextEditor] Error getting HTML content:', error);
          return '';
        }
      },
      setContentHTML: (html: string) => {
        try {
          richTextRef.current?.setContentHTML(html);
          const newCharCount = countHtmlCharacters(html);
          setCharacterCount(newCharCount);
          onCharacterCountChange?.(newCharCount);
        } catch (error) {
          console.error('[RichTextEditor] Error setting HTML content:', error);
          setCharacterCount(0);
          onCharacterCountChange?.(0);
        }
      },
    }));

    useEffect(() => {
      try {
        const newCharCount = countHtmlCharacters(value);
        setCharacterCount(newCharCount);
        onCharacterCountChange?.(newCharCount);
      } catch (error) {
        console.error('[RichTextEditor] Error counting characters:', error);
        setCharacterCount(0);
        onCharacterCountChange?.(0);
      }
    }, [value]);

    const handleCursorPosition = (scrollY: number) => {
      // Scroll cursor into view if needed
      // This helps with longer content
    };

    const handleChange = (html: string) => {
      try {
        const newCharCount = countHtmlCharacters(html);
        setCharacterCount(newCharCount);
        onCharacterCountChange?.(newCharCount);

        // Always propagate changes — even over the limit — so the editor
        // and the saved value never silently desync. The over-limit state
        // is surfaced via the character count UI and left to the caller
        // to gate saving on.
        onChange?.(html);
      } catch (error) {
        console.error('[RichTextEditor] Error handling content change:', error);
        // Still update character count to prevent UI from breaking
        setCharacterCount(0);
        onCharacterCountChange?.(0);
      }
    };

    const handleBlur = () => {
      onBlur?.();
    };

    const isOverLimit = !!characterLimit && characterCount > characterLimit;
    const isAtLimit = characterLimit && characterCount >= characterLimit;
    const isNearLimit = characterLimit && characterCount >= characterLimit * 0.9;

    return (
      <View style={[styles.container, style]}>
        <RichEditor
          ref={richTextRef}
          style={styles.editor}
          placeholder={placeholder || "Start writing..."}
          initialContentHTML={value}
          onChange={handleChange}
          onBlur={handleBlur}
          onCursorPosition={handleCursorPosition}
          disabled={disabled}
          editorStyle={editorStyle}
          useContainer={true}
          initialHeight={200}
        />
        
        {showToolbar && (
          <View style={styles.toolbarWrapper}>
            <RichToolbar
              editor={richTextRef}
              actions={[
                actions.setBold,
                actions.setItalic,
                actions.setUnderline,
                actions.heading1,
                actions.heading2,
                actions.setParagraph,
                actions.insertBulletsList,
                actions.insertOrderedList,
                actions.undo,
                actions.redo,
              ]}
              iconTint={colors.primary}
              selectedIconTint={colors.primaryDark}
              style={styles.toolbar}
              flatContainerStyle={styles.toolbarContainer}
            />
            {showSaveButton && (
              <TouchableOpacity
                style={styles.saveButton}
                onPress={onSave}
                disabled={isSaving || disabled || saveDisabled}
              >
                <Save size={18} color={isSaving ? colors.textMuted : colors.primary} />
                <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {showCharacterCount && (
          <View style={styles.characterCountContainer}>
            <Text style={[
              styles.characterCountText,
              ...(isNearLimit && !isAtLimit ? [styles.characterCountWarning] : []),
              ...(isAtLimit ? [styles.characterCountLimit] : [])
            ]}>
              {characterCount}{characterLimit ? ` / ${characterLimit}` : ''} characters
            </Text>
            {isOverLimit && (
              <Text style={styles.characterCountOverLimit}>
                {characterCount - (characterLimit as number)} characters over limit
              </Text>
            )}
          </View>
        )}
      </View>
    );
  }
);

const createEditorStyle = (colors: ThemeColors) => ({
  backgroundColor: 'transparent',
  color: colors.text,
  placeholderColor: colors.textMuted,
  caretColor: colors.primary,
  fontSize: '16px',
  fontFamily: Platform.OS === 'ios' ? 'Inter' : fonts.regular,
  lineHeight: '24px',
  padding: '16px',
  minHeight: '200px',
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.card,
  },
  editor: {
    flex: 1,
    minHeight: 200,
    backgroundColor: colors.surface,
  },
  toolbarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  toolbar: {
    flex: 1,
    backgroundColor: colors.background,
    minHeight: 50,
  },
  toolbarContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    minHeight: 50,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: colors.primary,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Inter' : fonts.semiBold,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: colors.textMuted,
  },
  characterCountContainer: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  characterCountText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : fonts.regular,
  },
  characterCountWarning: {
    color: colors.warning,
  },
  characterCountLimit: {
    color: colors.danger,
    fontWeight: '600',
  },
  characterCountOverLimit: {
    fontSize: 12,
    color: colors.danger,
    textAlign: 'right',
    marginTop: 2,
    fontFamily: Platform.OS === 'ios' ? 'Inter' : fonts.medium,
  },
});

RichTextEditor.displayName = 'RichTextEditor'; 