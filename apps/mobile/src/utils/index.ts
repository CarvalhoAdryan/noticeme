import type { NewsCategory } from '@dailybrief/shared';
import * as WebBrowser from 'expo-web-browser';
import type { AppThemeColors } from '../types';

export const LIGHT_COLORS: AppThemeColors = {
  background: '#FAF9F5',
  surface: '#FFFFFF',
  surfaceMuted: '#F1EFEA',
  text: '#141413',
  textSecondary: '#575653',
  primary: '#B91C1C',
  primarySoft: '#FEE2E2',
  border: '#E5E2DC',
  danger: '#DC2626',
  success: '#15803D',
};

export const DARK_COLORS: AppThemeColors = {
  background: '#0C0C0E',
  surface: '#16161A',
  surfaceMuted: '#222228',
  text: '#F4F3EF',
  textSecondary: '#A3A19A',
  primary: '#F87171',
  primarySoft: '#3B1818',
  border: '#2A2A32',
  danger: '#F87171',
  success: '#4ADE80',
};

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  geral: 'Geral',
  politica: 'Política',
  economia: 'Economia',
  tecnologia: 'Tecnologia',
  mundo: 'Mundo',
  esportes: 'Esportes',
  'ciencia-saude': 'Ciência e Saúde',
  engenharia: 'Engenharia',
  maranhao: 'Maranhão',
};

export const ALL_CATEGORIES: NewsCategory[] = [
  'geral',
  'politica',
  'economia',
  'tecnologia',
  'mundo',
  'esportes',
  'ciencia-saude',
  'engenharia',
  'maranhao',
];

export function formatRelativeTime(isoDate: string): string {
  const timestamp = Date.parse(isoDate);
  if (Number.isNaN(timestamp)) {
    return '';
  }

  const diffMs = Math.max(0, Date.now() - timestamp);
  const diffMinutes = Math.floor(diffMs / 60_000);

  if (diffMinutes < 1) {
    return 'agora';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} h`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} d`;
}

export async function openArticleInBrowser(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      dismissButtonStyle: 'close',
    });
  } catch {
    // Ignora erro caso o usuário feche o navegador antes do carregamento
  }
}
