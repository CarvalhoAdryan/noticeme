import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const AUTH_TOKEN_KEY = 'noticeme.auth.token';

export async function getStoredAuthToken(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return typeof window !== 'undefined'
        ? window.localStorage.getItem(AUTH_TOKEN_KEY)
        : null;
    } catch {
      return null;
    }
  }

  try {
    return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setStoredAuthToken(token: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_TOKEN_KEY, token);
      }
    } catch {
      // Ignora erro de storage no web
    }
    return;
  }

  try {
    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
  } catch {
    // Ignora falha silenciosa de SecureStore
  }
}

export async function clearStoredAuthToken(): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    } catch {
      // Ignora erro de storage no web
    }
    return;
  }

  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } catch {
    // Ignora falha silenciosa de SecureStore
  }
}
