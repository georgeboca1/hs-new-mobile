import {DarkTheme, Theme} from '@react-navigation/native';

export const colors = {
  background: '#0B0614',
  surface: '#1A102B',
  surfaceAlt: '#25163D',
  border: '#3C275F',
  neonPrimary: '#C63BFF',
  neonSecondary: '#8A2BFF',
  neonGlow: '#E87BFF',
  textPrimary: '#F6EBFF',
  textSecondary: '#CDB4E8',
  textMuted: '#9D84B9',
  success: '#63F7C8',
  danger: '#FF6BAA',
  inputBackground: '#120A20',
} as const;

export const appNavigationTheme: Theme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    primary: colors.neonPrimary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.neonGlow,
  },
};
