import type { NewsCategory } from '@dailybrief/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const HIDDEN_CATEGORIES_KEY = 'noticeme.hidden.categories';

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
  if (Platform.OS === 'web') {
    try {
      const raw =
        typeof window !== 'undefined'
          ? window.localStorage.getItem(HIDDEN_CATEGORIES_KEY)
          : null;
      return parseCategoriesJson(raw);
    } catch {
      return [];
    }
  }

  try {
    const raw = await SecureStore.getItemAsync(HIDDEN_CATEGORIES_KEY);
    return parseCategoriesJson(raw);
  } catch {
    return [];
  }
}

export async function setStoredHiddenCategories(
  categories: NewsCategory[],
): Promise<void> {
  const serialized = JSON.stringify(categories);

  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(HIDDEN_CATEGORIES_KEY, serialized);
      }
    } catch {
      // Ignora erro de storage no web
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(HIDDEN_CATEGORIES_KEY, serialized);
  } catch {
    // Ignora falha silenciosa de SecureStore
  }
}
