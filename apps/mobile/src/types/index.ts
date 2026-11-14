export type ThemePreference = 'system' | 'light' | 'dark';

export type ThemePresetId =
  | 'editorial'
  | 'ocean'
  | 'forest'
  | 'amber'
  | 'indigo'
  | 'love';

export interface AppThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  primary: string;
  primarySoft: string;
  border: string;
  danger: string;
  success: string;
}

export interface ThemePresetDefinition {
  id: ThemePresetId;
  label: string;
  swatch: string;
  light: AppThemeColors;
  dark: AppThemeColors;
}
