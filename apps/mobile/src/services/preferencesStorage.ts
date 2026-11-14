import type { NewsCategory } from '@dailybrief/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { ThemePreference, ThemePresetId } from '../types';

const HIDDEN_CATEGORIES_KEY = 'noticeme.hidden.categories';
const THEME_SETTINGS_KEY = 'noticeme.theme.settings';

const VALID_PREFERENCES = new Set<ThemePreference>(['system', 'light', 'dark']);
const VALID_PRESETS = new Set<ThemePresetId>([
  'editorial',
  'ocean',
  'forest',
  'amber',
  'indigo',
  'love',
]);

export interface StoredThemeSettings {
  preference: ThemePreference;
  preset: ThemePresetId;
}

async function readStoredItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(key)
        : null;
    } catch {
      return null;
    }
  }

  try {
    return await SecureStore.getItemAsync(key);
  } catch {
    return null;
  }
}

async function writeStoredItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, value);
      }
    } catch {
      // Ignora erro de storage no web
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(key, value);
  } catch {
    // Ignora falha silenciosa de SecureStore
  }
}

function parseCategoriesJson(raw: string | null): NewsCategory[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is NewsCategory => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export async function getStoredHiddenCategories(): Promise<NewsCategory[]> {
  return parseCategoriesJson(await readStoredItem(HIDDEN_CATEGORIES_KEY));
}

export async function setStoredHiddenCategories(
  categories: NewsCategory[],
): Promise<void> {
  await writeStoredItem(HIDDEN_CATEGORIES_KEY, JSON.stringify(categories));
}

export async function getStoredThemeSettings(): Promise<StoredThemeSettings | null> {
  const raw = await readStoredItem(THEME_SETTINGS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<StoredThemeSettings>;
    const preference =
      parsed.preference && VALID_PREFERENCES.has(parsed.preference)
        ? parsed.preference
        : 'system';
    const preset =
      parsed.preset && VALID_PRESETS.has(parsed.preset)
        ? parsed.preset
        : 'editorial';
    return { preference, preset };
  } catch {
    return null;
  }
}

export async function setStoredThemeSettings(
  settings: StoredThemeSettings,
): Promise<void> {
  await writeStoredItem(THEME_SETTINGS_KEY, JSON.stringify(settings));
}
