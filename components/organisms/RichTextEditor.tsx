import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { countHtmlCharacters, isHtmlEmpty } from '@/utils/html';
import { Save } from 'lucide-react-native';

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
  showSaveButton?: boolean;
  isSaving?: boolean;
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
    showSaveButton = false,
    isSaving = false
  }, ref) => {
    const richTextRef = useRef<RichEditor>(null);
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
          setCharacterCount(countHtmlCharacters(html));
        } catch (error) {
          console.error('[RichTextEditor] Error setting HTML content:', error);
          setCharacterCount(0);
        }
      },
    }));

    useEffect(() => {
      try {
        setCharacterCount(countHtmlCharacters(value));
      } catch (error) {
        console.error('[RichTextEditor] Error counting characters:', error);
        setCharacterCount(0);
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

        // If there's a character limit, enforce it
        if (characterLimit && newCharCount > characterLimit) {
          // Don't call onChange if limit exceeded
          return;
        }

        onChange?.(html);
      } catch (error) {
        console.error('[RichTextEditor] Error handling content change:', error);
        // Still update character count to prevent UI from breaking
        setCharacterCount(0);
      }
    };

    const handleBlur = () => {
      onBlur?.();
    };

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
            iconTint="#6366F1"
            selectedIconTint="#8B5CF6"
            style={styles.toolbar}
            flatContainerStyle={styles.toolbarContainer}
          />
          {showSaveButton && (
            <TouchableOpacity
              style={styles.saveButton}
              onPress={onSave}
              disabled={isSaving || disabled}
            >
              <Save size={18} color={isSaving ? "#94A3B8" : "#6366F1"} />
              <Text style={[styles.saveButtonText, isSaving && styles.saveButtonTextDisabled]}>
                {isSaving ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        
        {showCharacterCount && (
          <View style={styles.characterCountContainer}>
            <Text style={[
              styles.characterCountText,
              ...(isNearLimit && !isAtLimit ? [styles.characterCountWarning] : []),
              ...(isAtLimit ? [styles.characterCountLimit] : [])
            ]}>
              {characterCount}{characterLimit ? ` / ${characterLimit}` : ''} characters
            </Text>
          </View>
        )}
      </View>
    );
  }
);

const editorStyle = {
  backgroundColor: 'transparent',
  color: '#1E293B',
  fontSize: '16px',
  fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter-Regular',
  lineHeight: '24px',
  padding: '16px',
  minHeight: '200px',
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  editor: {
    flex: 1,
    minHeight: 200,
    backgroundColor: 'white',
  },
  toolbarWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  toolbar: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    minHeight: 50,
  },
  toolbarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: '#E2E8F0',
    minHeight: 50,
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    color: '#6366F1',
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter-SemiBold',
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#94A3B8',
  },
  characterCountContainer: {
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  characterCountText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Inter' : 'Inter-Regular',
  },
  characterCountWarning: {
    color: '#F59E0B',
  },
  characterCountLimit: {
    color: '#EF4444',
    fontWeight: '600',
  },
});

RichTextEditor.displayName = 'RichTextEditor'; 