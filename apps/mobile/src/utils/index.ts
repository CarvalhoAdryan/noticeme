import type { NewsCategory } from '@dailybrief/shared';
import * as WebBrowser from 'expo-web-browser';
import type {
  AppThemeColors,
  ThemePresetDefinition,
  ThemePresetId,
} from '../types';

export const THEME_PRESETS: Record<ThemePresetId, ThemePresetDefinition> = {
  editorial: {
    id: 'editorial',
    label: 'Editorial',
    swatch: '#B91C1C',
    light: {
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
    },
    dark: {
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
    },
  },
  ocean: {
    id: 'ocean',
    label: 'Oceano',
    swatch: '#0369A1',
    light: {
      background: '#F4F8FB',
      surface: '#FFFFFF',
      surfaceMuted: '#E8F0F6',
      text: '#0F172A',
      textSecondary: '#475569',
      primary: '#0369A1',
      primarySoft: '#E0F2FE',
      border: '#D5E2EC',
      danger: '#DC2626',
      success: '#15803D',
    },
    dark: {
      background: '#081018',
      surface: '#101B26',
      surfaceMuted: '#1A2938',
      text: '#F1F5F9',
      textSecondary: '#94A3B8',
      primary: '#38BDF8',
      primarySoft: '#122E44',
      border: '#223548',
      danger: '#F87171',
      success: '#4ADE80',
    },
  },
  forest: {
    id: 'forest',
    label: 'Esmeralda',
    swatch: '#047857',
    light: {
      background: '#F4F9F6',
      surface: '#FFFFFF',
      surfaceMuted: '#E6F1EB',
      text: '#0E1B14',
      textSecondary: '#445C4F',
      primary: '#047857',
      primarySoft: '#D1FAE5',
      border: '#D2E4DA',
      danger: '#DC2626',
      success: '#15803D',
    },
    dark: {
      background: '#08120D',
      surface: '#101D16',
      surfaceMuted: '#192C22',
      text: '#ECFDF5',
      textSecondary: '#98B3A4',
      primary: '#34D399',
      primarySoft: '#113627',
      border: '#213B2D',
      danger: '#F87171',
      success: '#4ADE80',
    },
  },
  amber: {
    id: 'amber',
    label: 'Âmbar',
    swatch: '#B45309',
    light: {
      background: '#FCF8F2',
      surface: '#FFFFFF',
      surfaceMuted: '#F5EDE0',
      text: '#1C160F',
      textSecondary: '#665847',
      primary: '#B45309',
      primarySoft: '#FEF3C7',
      border: '#E9DCCB',
      danger: '#DC2626',
      success: '#15803D',
    },
    dark: {
      background: '#120E09',
      surface: '#1D1710',
      surfaceMuted: '#2B2218',
      text: '#FAF5EC',
      textSecondary: '#B5A693',
      primary: '#FBBF24',
      primarySoft: '#3B2B10',
      border: '#3A2E21',
      danger: '#F87171',
      success: '#4ADE80',
    },
  },
  indigo: {
    id: 'indigo',
    label: 'Índigo',
    swatch: '#4338CA',
    light: {
      background: '#F6F6FC',
      surface: '#FFFFFF',
      surfaceMuted: '#EAEAF7',
      text: '#131324',
      textSecondary: '#4E4E6E',
      primary: '#4338CA',
      primarySoft: '#E0E7FF',
      border: '#D8D8EE',
      danger: '#DC2626',
      success: '#15803D',
    },
    dark: {
      background: '#0B0B14',
      surface: '#141424',
      surfaceMuted: '#1F1F36',
      text: '#F4F4FF',
      textSecondary: '#9E9EC2',
      primary: '#818CF8',
      primarySoft: '#22224A',
      border: '#2B2B48',
      danger: '#F87171',
      success: '#4ADE80',
    },
  },
  love: {
    id: 'love',
    label: 'Love',
    swatch: '#DB2777',
    light: {
      background: '#FFF5F8',
      surface: '#FFFFFF',
      surfaceMuted: '#FCE7F3',
      text: '#2A101B',
      textSecondary: '#7A435B',
      primary: '#DB2777',
      primarySoft: '#FCE7F3',
      border: '#F5D0E0',
      danger: '#DC2626',
      success: '#15803D',
    },
    dark: {
      background: '#170B12',
      surface: '#24121C',
      surfaceMuted: '#331928',
      text: '#FDF2F8',
      textSecondary: '#D1A3B8',
      primary: '#F472B6',
      primarySoft: '#4A1935',
      border: '#432134',
      danger: '#F87171',
      success: '#4ADE80',
    },
  },
};

export const THEME_PRESET_LIST: ThemePresetDefinition[] = Object.values(THEME_PRESETS);

export const LIGHT_COLORS: AppThemeColors = THEME_PRESETS.editorial.light;
export const DARK_COLORS: AppThemeColors = THEME_PRESETS.editorial.dark;

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

const MOBILE_NAMED_ENTITIES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  ndash: '–',
  mdash: '—',
  hellip: '…',
  aacute: 'á',
  Aacute: 'Á',
  agrave: 'à',
  Agrave: 'À',
  acirc: 'â',
  Acirc: 'Â',
  atilde: 'ã',
  Atilde: 'Ã',
  eacute: 'é',
  Eacute: 'É',
  ecirc: 'ê',
  Ecirc: 'Ê',
  iacute: 'í',
  Iacute: 'Í',
  oacute: 'ó',
  Oacute: 'Ó',
  ocirc: 'ô',
  Ocirc: 'Ô',
  otilde: 'õ',
  Otilde: 'Õ',
  uacute: 'ú',
  Uacute: 'Ú',
  ccedil: 'ç',
  Ccedil: 'Ç',
};

export function sanitizeDisplayText(text?: string | null): string {
  if (!text) return '';

  return text
    .replace(/&amp;(#(?:\d+|x[0-9a-fA-F]+)|[a-zA-Z][a-zA-Z0-9]+);/g, '&$1;')
    .replace(/&#(\d+);/g, (match, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .replace(/&#x([0-9a-fA-F]+);/gi, (match, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    })
    .replace(/&([a-zA-Z][a-zA-Z0-9]+);/g, (match, name: string) => {
      return MOBILE_NAMED_ENTITIES[name] ?? MOBILE_NAMED_ENTITIES[name.toLowerCase()] ?? match;
    })
    .replace(/[\u200B-\u200D\uFEFF\uFFFD]/g, '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
