import { create } from 'zustand';
import type { ThemePreference, ThemePresetId } from '../types';

interface ThemeState {
  preference: ThemePreference;
  preset: ThemePresetId;
  setPreference: (preference: ThemePreference) => void;
  setPreset: (preset: ThemePresetId) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  preset: 'editorial',
  setPreference: (preference) => set({ preference }),
  setPreset: (preset) => set({ preset }),
}));
