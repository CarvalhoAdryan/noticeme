import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/theme.store';
import type { AppThemeColors } from '../types';
import { DARK_COLORS, LIGHT_COLORS } from '../utils';

export function useAppTheme(): {
  isDark: boolean;
  colors: AppThemeColors;
} {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);

  const isDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  return {
    isDark,
    colors: isDark ? DARK_COLORS : LIGHT_COLORS,
  };
}
