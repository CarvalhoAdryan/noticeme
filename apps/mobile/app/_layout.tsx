import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { warmUpApi } from '../src/services/warmup';
import { hydrateWeatherLocation } from '../src/services/weather.service';
import { useAuthStore } from '../src/store/auth.store';
import { useBookmarksStore } from '../src/store/bookmarks.store';
import { useThemeStore } from '../src/store/theme.store';

export default function RootLayout() {
  const { isDark } = useAppTheme();

  useEffect(() => {
    warmUpApi();
    void useThemeStore.getState().hydrateTheme();
    void useBookmarksStore.getState().hydrateBookmarks();
    void useAuthStore.getState().hydrateSession();
    void hydrateWeatherLocation();
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </ThemeProvider>
  );
}
