import type { UserProfile } from '@dailybrief/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'noticeme.auth.token';
const AUTH_USER_KEY = 'noticeme.auth.user';

async function readStoredKey(key: string): Promise<string | null> {
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

async function writeStoredKey(key: string, value: string): Promise<void> {
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

async function deleteStoredKey(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(key);
      }
    } catch {
      // Ignora erro de storage no web
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(key);
  } catch {
    // Ignora falha silenciosa de SecureStore
  }
}

export async function getStoredAuthToken(): Promise<string | null> {
  return readStoredKey(AUTH_TOKEN_KEY);
}

export async function setStoredAuthToken(token: string): Promise<void> {
  await writeStoredKey(AUTH_TOKEN_KEY, token);
}

export async function clearStoredAuthToken(): Promise<void> {
  await deleteStoredKey(AUTH_TOKEN_KEY);
}

export async function getStoredAuthUser(): Promise<UserProfile | null> {
  const raw = await readStoredKey(AUTH_USER_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<UserProfile>;
    if (
      typeof parsed?.id === 'string' &&
      typeof parsed?.email === 'string' &&
      Array.isArray(parsed?.categories)
    ) {
      return parsed as UserProfile;
    }
    return null;
  } catch {
    return null;
  }
}

export async function setStoredAuthUser(user: UserProfile): Promise<void> {
  await writeStoredKey(AUTH_USER_KEY, JSON.stringify(user));
}

export async function clearStoredAuthUser(): Promise<void> {
  await deleteStoredKey(AUTH_USER_KEY);
}
