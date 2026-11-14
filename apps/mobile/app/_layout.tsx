import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useAppTheme } from '../src/hooks/useAppTheme';
import { warmUpApi } from '../src/services/warmup';
import { useAuthStore } from '../src/store/auth.store';

export default function RootLayout() {
  const { isDark } = useAppTheme();

  useEffect(() => {
    warmUpApi();
    void useAuthStore.getState().hydrateSession();
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
