import type { ArticleFeedItem } from '@dailybrief/shared';
import {
  compactArticleForCache,
  readChunkedJson,
  writeChunkedJson,
} from './secureChunkStorage';

const FEED_CACHE_PREFIX = 'noticeme.feed.cache';
const MAX_CACHED_ARTICLES = 12;

let memoryFeedCache: ArticleFeedItem[] = [];

export async function readCachedFeed(): Promise<ArticleFeedItem[]> {
  if (memoryFeedCache.length > 0) {
    return memoryFeedCache;
  }

  const items = await readChunkedJson<ArticleFeedItem[]>(FEED_CACHE_PREFIX);
  if (Array.isArray(items) && items.length > 0) {
    memoryFeedCache = items;
    return items;
  }

  return [];
}

export async function writeCachedFeed(
  articles: ArticleFeedItem[],
): Promise<void> {
  const compacted = articles
    .slice(0, MAX_CACHED_ARTICLES)
    .map(compactArticleForCache);
  memoryFeedCache = compacted;
  await writeChunkedJson(FEED_CACHE_PREFIX, compacted);
}
