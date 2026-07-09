import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { Animated, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, shadows, spacing } from '@/lib/theme';

interface ToastContextValue {
  showToast: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const VISIBLE_DURATION = 2000;
const ANIMATION_DURATION = 200;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;
  const hideTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hideToast = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 16, duration: ANIMATION_DURATION, useNativeDriver: true }),
    ]).start(() => setMessage(null));
  }, [opacity, translateY]);

  const showToast = useCallback((text: string) => {
    if (hideTimeout.current) {
      clearTimeout(hideTimeout.current);
    }
    setMessage(text);
    opacity.setValue(0);
    translateY.setValue(16);
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: ANIMATION_DURATION, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: ANIMATION_DURATION, useNativeDriver: true }),
    ]).start();
    hideTimeout.current = setTimeout(hideToast, VISIBLE_DURATION);
  }, [opacity, translateY, hideToast]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {message !== null && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.container,
            { opacity, transform: [{ translateY }] },
          ]}
        >
          <Text style={styles.text}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.xxl,
    right: spacing.xxl,
    bottom: spacing.xxxl,
    alignItems: 'center',
    backgroundColor: colors.text,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    ...shadows.toast,
  },
  text: {
    fontFamily: fonts.medium,
    fontSize: 14,
    color: colors.white,
    textAlign: 'center',
  },
});
