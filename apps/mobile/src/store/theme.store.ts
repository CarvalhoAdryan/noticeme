import { create } from 'zustand';
import {
  getStoredThemeSettings,
  setStoredThemeSettings,
} from '../services/preferencesStorage';
import type { ThemePreference, ThemePresetId } from '../types';

interface ThemeState {
  preference: ThemePreference;
  preset: ThemePresetId;
  hydrateTheme: () => Promise<void>;
  setPreference: (preference: ThemePreference) => void;
  setPreset: (preset: ThemePresetId) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  preference: 'system',
  preset: 'editorial',

  hydrateTheme: async () => {
    const saved = await getStoredThemeSettings();
    if (saved) {
      set({ preference: saved.preference, preset: saved.preset });
    }
  },

  setPreference: (preference) => {
    set({ preference });
    void setStoredThemeSettings({ preference, preset: get().preset });
  },

  setPreset: (preset) => {
    set({ preset });
    void setStoredThemeSettings({ preference: get().preference, preset });
  },
}));
