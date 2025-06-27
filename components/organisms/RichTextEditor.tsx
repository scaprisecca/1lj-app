import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { RichEditor, RichToolbar, actions } from 'react-native-pell-rich-editor';
import { countHtmlCharacters, isHtmlEmpty } from '@/utils/html';

interface RichTextEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  style?: any;
  showCharacterCount?: boolean;
  characterLimit?: number;
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
    placeholder, 
    disabled = false, 
    style, 
    showCharacterCount = false,
    characterLimit 
  }, ref) => {
    const richTextRef = useRef<RichEditor>(null);
    const [characterCount, setCharacterCount] = useState(0);

    useImperativeHandle(ref, () => ({
      focus: () => richTextRef.current?.focusContentEditor(),
      blur: () => richTextRef.current?.blurContentEditor(),
      getContentHtml: async () => {
        return await richTextRef.current?.getContentHtml() || '';
      },
      setContentHTML: (html: string) => {
        richTextRef.current?.setContentHTML(html);
        setCharacterCount(countHtmlCharacters(html));
      },
    }));

    useEffect(() => {
      setCharacterCount(countHtmlCharacters(value));
    }, [value]);

    const handleCursorPosition = (scrollY: number) => {
      // Scroll cursor into view if needed
      // This helps with longer content
    };

    const handleChange = (html: string) => {
      const newCharCount = countHtmlCharacters(html);
      setCharacterCount(newCharCount);
      
      // If there's a character limit, enforce it
      if (characterLimit && newCharCount > characterLimit) {
        // Don't call onChange if limit exceeded
        return;
      }
      
      onChange?.(html);
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
  toolbar: {
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    minHeight: 50,
  },
  toolbarContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
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