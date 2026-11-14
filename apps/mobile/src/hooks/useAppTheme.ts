import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/theme.store';
import type { AppThemeColors, ThemePresetId } from '../types';
import { THEME_PRESETS } from '../utils';

export function useAppTheme(): {
  isDark: boolean;
  preset: ThemePresetId;
  colors: AppThemeColors;
} {
  const systemScheme = useColorScheme();
  const preference = useThemeStore((state) => state.preference);
  const preset = useThemeStore((state) => state.preset);

  const isDark =
    preference === 'system' ? systemScheme === 'dark' : preference === 'dark';

  const palette = THEME_PRESETS[preset] ?? THEME_PRESETS.editorial;

  return {
    isDark,
    preset,
    colors: isDark ? palette.dark : palette.light,
  };
}
