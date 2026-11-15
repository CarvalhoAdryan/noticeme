import type { ArticleFeedItem } from '@dailybrief/shared';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CHUNK_SIZE = 1200;

async function readItem(key: string): Promise<string | null> {
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

async function writeItem(key: string, value: string): Promise<void> {
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

async function deleteItem(key: string): Promise<void> {
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

export async function readChunkedJson<T>(prefix: string): Promise<T | null> {
  if (Platform.OS === 'web') {
    const raw = await readItem(prefix);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  const metaRaw = await readItem(`${prefix}.meta`);
  const totalChunks = metaRaw ? Number.parseInt(metaRaw, 10) : 0;
  if (!Number.isFinite(totalChunks) || totalChunks <= 0) {
    return null;
  }

  const parts = await Promise.all(
    Array.from({ length: totalChunks }, (_, idx) =>
      readItem(`${prefix}.${idx}`),
    ),
  );

  if (parts.some((part) => part === null)) {
    return null;
  }

  try {
    return JSON.parse(parts.join('')) as T;
  } catch {
    return null;
  }
}

export async function writeChunkedJson<T>(
  prefix: string,
  value: T,
): Promise<void> {
  const serialized = JSON.stringify(value);

  if (Platform.OS === 'web') {
    await writeItem(prefix, serialized);
    return;
  }

  const prevMetaRaw = await readItem(`${prefix}.meta`);
  const prevTotal = prevMetaRaw ? Number.parseInt(prevMetaRaw, 10) : 0;

  const chunks: string[] = [];
  for (let i = 0; i < serialized.length; i += CHUNK_SIZE) {
    chunks.push(serialized.slice(i, i + CHUNK_SIZE));
  }
  if (chunks.length === 0) {
    chunks.push('null');
  }

  await Promise.all(
    chunks.map((chunk, idx) => writeItem(`${prefix}.${idx}`, chunk)),
  );
  await writeItem(`${prefix}.meta`, String(chunks.length));

  if (Number.isFinite(prevTotal) && prevTotal > chunks.length) {
    await Promise.all(
      Array.from({ length: prevTotal - chunks.length }, (_, offset) =>
        deleteItem(`${prefix}.${chunks.length + offset}`),
      ),
    );
  }
}

export async function clearChunkedJson(prefix: string): Promise<void> {
  if (Platform.OS === 'web') {
    await deleteItem(prefix);
    return;
  }

  const metaRaw = await readItem(`${prefix}.meta`);
  const totalChunks = metaRaw ? Number.parseInt(metaRaw, 10) : 0;

  await deleteItem(`${prefix}.meta`);
  if (Number.isFinite(totalChunks) && totalChunks > 0) {
    await Promise.all(
      Array.from({ length: totalChunks }, (_, idx) =>
        deleteItem(`${prefix}.${idx}`),
      ),
    );
  }
}

export function compactArticleForCache(
  article: ArticleFeedItem,
): ArticleFeedItem {
  const summary =
    article.summary && article.summary.length > 260
      ? `${article.summary.slice(0, 257)}...`
      : article.summary;

  return {
    id: article.id,
    title: article.title,
    description: null,
    summary,
    url: article.url,
    imageUrl: article.imageUrl,
    author: article.author ?? null,
    publishedAt: article.publishedAt,
    collectedAt: article.collectedAt,
    source: {
      id: article.source.id,
      name: article.source.name,
      slug: article.source.slug,
    },
    categories: article.categories,
    userState: article.userState ?? null,
  };
}
