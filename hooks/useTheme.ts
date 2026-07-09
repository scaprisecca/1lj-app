import { useColorScheme } from 'react-native';
import { darkColors, fonts, lightColors, radii, shadows, spacing, ThemeColors } from '@/lib/theme';

interface Theme {
  colors: ThemeColors;
  fonts: typeof fonts;
  spacing: typeof spacing;
  radii: typeof radii;
  shadows: typeof shadows;
  isDark: boolean;
}

/**
 * Resolves the active color palette from the system color scheme.
 * `fonts`/`spacing`/`radii`/`shadows` are scheme-independent and passed
 * through unchanged so screens only need one import for all tokens.
 */
export function useTheme(): Theme {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  return {
    colors: isDark ? darkColors : lightColors,
    fonts,
    spacing,
    radii,
    shadows,
    isDark,
  };
}
