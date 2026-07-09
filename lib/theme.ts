/**
 * Design tokens for One Line Journal.
 *
 * Single source of truth for colors, typography, spacing, radii, and
 * shadow presets. Import from here instead of hardcoding hex values or
 * repeating shadow blocks.
 */

export interface ThemeColors {
  // Brand
  primary: string;
  primaryDark: string;
  gradient: [string, string];
  backgroundGradient: [string, string];

  // Surfaces
  background: string;
  surface: string;
  white: string;
  black: string;

  // Text
  text: string;
  textBody: string;
  textSecondary: string;
  textMuted: string;
  textOnDark: string;

  // Borders / dividers / disabled
  border: string;
  borderLight: string;
  disabled: string;

  // Tints
  indigoTint: string;
  blueTint: string;

  // Semantic
  success: string;
  successTint: string;

  warning: string;
  warningTint: string;
  warningBorder: string;
  warningText: string;

  danger: string;
}

export const lightColors: ThemeColors = {
  // Brand
  primary: '#6366F1',
  primaryDark: '#8B5CF6',
  gradient: ['#6366F1', '#8B5CF6'],
  backgroundGradient: ['#F8FAFC', '#F1F5F9'],

  // Surfaces
  background: '#F8FAFC',
  surface: '#FFFFFF',
  white: '#FFFFFF',
  black: '#000000',

  // Text
  text: '#1E293B',
  textBody: '#334155',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',
  textOnDark: '#FFFFFF',

  // Borders / dividers / disabled
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  disabled: '#CBD5E1',

  // Tints
  indigoTint: '#EEF2FF',
  blueTint: '#F0F7FF',

  // Semantic
  success: '#10B981',
  successTint: '#D1FAE5',

  warning: '#F59E0B',
  warningTint: '#FEF3C7',
  warningBorder: '#FCD34D',
  warningText: '#92400E',

  danger: '#EF4444',
};

export const darkColors: ThemeColors = {
  // Brand — keep the indigo/violet gradient consistent across themes
  primary: '#818CF8',
  primaryDark: '#A78BFA',
  gradient: ['#6366F1', '#8B5CF6'],
  backgroundGradient: ['#0F172A', '#1E293B'],

  // Surfaces
  background: '#0F172A',
  surface: '#1E293B',
  white: '#FFFFFF',
  black: '#000000',

  // Text
  text: '#F1F5F9',
  textBody: '#E2E8F0',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  textOnDark: '#FFFFFF',

  // Borders / dividers / disabled
  border: '#334155',
  borderLight: '#1E293B',
  disabled: '#475569',

  // Tints
  indigoTint: '#1E1B4B',
  blueTint: '#1E2A45',

  // Semantic
  success: '#34D399',
  successTint: '#064E3B',

  warning: '#FBBF24',
  warningTint: '#78350F',
  warningBorder: '#92400E',
  warningText: '#FDE68A',

  danger: '#F87171',
};

/** Default export kept for any not-yet-themed call sites; prefer useTheme(). */
export const colors = lightColors;

export const fonts = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  semiBold: 'Inter-SemiBold',
  bold: 'Inter-Bold',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  full: 9999,
} as const;

export const shadows = {
  card: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  subtle: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  compact: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  button: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  low: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  toast: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  modal: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 10,
  },
} as const;
