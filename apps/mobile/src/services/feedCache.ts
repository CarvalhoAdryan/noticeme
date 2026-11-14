import type { ArticleFeedItem } from '@dailybrief/shared';

interface ExpoFileSystemLike {
  cacheDirectory?: string | null;
  documentDirectory?: string | null;
  readAsStringAsync: (fileUri: string) => Promise<string>;
  writeAsStringAsync: (fileUri: string, contents: string) => Promise<void>;
}

const FEED_CACHE_FILENAME = 'noticeme_feed_cache.json';
const FEED_STORAGE_KEY = 'noticeme.feed.cache';
const MAX_CACHED_ARTICLES = 20;

let memoryFeedCache: ArticleFeedItem[] = [];

function getExpoFileSystem(): ExpoFileSystemLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('expo-file-system') as ExpoFileSystemLike;
    if (
      typeof fs?.readAsStringAsync === 'function' &&
      typeof fs?.writeAsStringAsync === 'function'
    ) {
      return fs;
    }
    return null;
  } catch {
    return null;
  }
}

function getCacheFileUri(fs: ExpoFileSystemLike): string | null {
  const baseDir = fs.cacheDirectory ?? fs.documentDirectory;
  return baseDir ? `${baseDir}${FEED_CACHE_FILENAME}` : null;
}

function parseArticles(raw: string | null): ArticleFeedItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ArticleFeedItem[]) : [];
  } catch {
    return [];
  }
}

export async function readCachedFeed(): Promise<ArticleFeedItem[]> {
  if (memoryFeedCache.length > 0) {
    return memoryFeedCache;
  }

  const fs = getExpoFileSystem();
  const fileUri = fs ? getCacheFileUri(fs) : null;
  if (fs && fileUri) {
    try {
      const raw = await fs.readAsStringAsync(fileUri);
      const items = parseArticles(raw);
      if (items.length > 0) {
        memoryFeedCache = items;
        return items;
      }
    } catch {
      // Arquivo ainda não existe ou erro de leitura
    }
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const items = parseArticles(storage?.getItem(FEED_STORAGE_KEY) ?? null);
    if (items.length > 0) {
      memoryFeedCache = items;
      return items;
    }
  } catch {
    // Ignora falha de leitura
  }

  return [];
}

export async function writeCachedFeed(
  articles: ArticleFeedItem[],
): Promise<void> {
  const sliced = articles.slice(0, MAX_CACHED_ARTICLES);
  memoryFeedCache = sliced;
  const serialized = JSON.stringify(sliced);

  const fs = getExpoFileSystem();
  const fileUri = fs ? getCacheFileUri(fs) : null;
  if (fs && fileUri) {
    try {
      await fs.writeAsStringAsync(fileUri, serialized);
      return;
    } catch {
      // Fallback para localStorage
    }
  }

  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(FEED_STORAGE_KEY, serialized);
  } catch {
    // Ignora falha de escrita
  }
}
