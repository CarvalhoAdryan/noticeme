import type { ArticleFeedItem } from '@dailybrief/shared';
import {
  clearChunkedJson,
  compactArticleForCache,
  readChunkedJson,
  writeChunkedJson,
} from './secureChunkStorage';

export interface PendingFavoriteOp {
  article: ArticleFeedItem;
  isFavorite: boolean;
}

export interface BookmarksCachePayload {
  savedArticles: ArticleFeedItem[];
  favoriteIds: Record<string, boolean>;
  readIds: Record<string, boolean>;
  pendingFavorites: PendingFavoriteOp[];
}

const BOOKMARKS_CACHE_PREFIX = 'noticeme.bookmarks.cache';
const MAX_CACHED_BOOKMARKS = 30;

export async function readBookmarksCache(): Promise<BookmarksCachePayload | null> {
  const parsed = await readChunkedJson<Partial<BookmarksCachePayload>>(
    BOOKMARKS_CACHE_PREFIX,
  );
  if (!parsed || typeof parsed !== 'object') {
    return null;
  }

  return {
    savedArticles: Array.isArray(parsed.savedArticles)
      ? parsed.savedArticles
      : [],
    favoriteIds:
      parsed.favoriteIds && typeof parsed.favoriteIds === 'object'
        ? parsed.favoriteIds
        : {},
    readIds:
      parsed.readIds && typeof parsed.readIds === 'object' ? parsed.readIds : {},
    pendingFavorites: Array.isArray(parsed.pendingFavorites)
      ? parsed.pendingFavorites
      : [],
  };
}

export async function writeBookmarksCache(
  payload: BookmarksCachePayload,
): Promise<void> {
  await writeChunkedJson<BookmarksCachePayload>(BOOKMARKS_CACHE_PREFIX, {
    savedArticles: payload.savedArticles
      .slice(0, MAX_CACHED_BOOKMARKS)
      .map(compactArticleForCache),
    favoriteIds: payload.favoriteIds,
    readIds: payload.readIds,
    pendingFavorites: payload.pendingFavorites.map((op) => ({
      article: compactArticleForCache(op.article),
      isFavorite: op.isFavorite,
    })),
  });
}

export async function clearBookmarksCache(): Promise<void> {
  await clearChunkedJson(BOOKMARKS_CACHE_PREFIX);
}
