import {DarkTheme, DefaultTheme, Theme} from '@react-navigation/native';
import {useTelemetryStore} from '../store/useTelemetryStore';

export const darkColors = {
  background: '#0A0A0A',
  surface: '#121212',
  surfaceAlt: '#1E1E1E',
  border: '#2C2C2C',
  neonPrimary: '#2DD4BF',
  neonSecondary: '#0EA5B7',
  neonGlow: '#34D399',
  textPrimary: '#E6EEF0',
  textSecondary: '#AFC7C9',
  textMuted: '#7F9A9B',
  success: '#63F7C8',
  danger: '#FF6BAA',
  inputBackground: '#0F1112',
};

export const lightColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceAlt: '#F1F5F9',
  border: '#E2E8F0',
  neonPrimary: '#0D9488',
  neonSecondary: '#0891B2',
  neonGlow: '#059669',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  success: '#10B981',
  danger: '#EF4444',
  inputBackground: '#F1F5F9',
};

export type AppColors = typeof darkColors;

/**
 * Hook to access the current theme colors based on the store's themeMode.
 */
export function useAppColors(): AppColors {
  const themeMode = useTelemetryStore(state => state.settings?.themeMode);
  return themeMode === 'light' ? lightColors : darkColors;
}

export const appNavigationThemeDark: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: darkColors.neonPrimary,
    background: darkColors.background,
    card: darkColors.surface,
    text: darkColors.textPrimary,
    border: darkColors.border,
    notification: darkColors.neonGlow,
  },
};

export const appNavigationThemeLight: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: lightColors.neonPrimary,
    background: lightColors.background,
    card: lightColors.surface,
    text: lightColors.textPrimary,
    border: lightColors.border,
    notification: lightColors.neonGlow,
  },
};
