import type { ArticleFeedItem } from '@dailybrief/shared';
import { create } from 'zustand';
import {
  fetchFavoritesApi,
  markArticleReadApi,
  setArticleFavoriteApi,
} from '../services/user.service';

interface BookmarksState {
  savedArticles: ArticleFeedItem[];
  favoriteIds: Record<string, boolean>;
  readIds: Record<string, boolean>;
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  syncFromFeed: (items: ArticleFeedItem[]) => void;
  loadFavorites: (isAuthenticated: boolean, reset?: boolean) => Promise<void>;
  toggleBookmark: (
    article: ArticleFeedItem,
    isAuthenticated: boolean,
  ) => Promise<void>;
  markAsRead: (articleId: string, isAuthenticated: boolean) => Promise<void>;
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  savedArticles: [],
  favoriteIds: {},
  readIds: {},
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  error: null,

  syncFromFeed: (items) => {
    const nextFavs = { ...get().favoriteIds };
    const nextReads = { ...get().readIds };

    for (const item of items) {
      if (item.userState) {
        if (item.userState.isFavorite) {
          nextFavs[item.id] = true;
        }
        if (item.userState.readAt) {
          nextReads[item.id] = true;
        }
      }
    }

    set({ favoriteIds: nextFavs, readIds: nextReads });
  },

  loadFavorites: async (isAuthenticated, reset = true) => {
    if (!isAuthenticated) {
      set({ isLoading: false, error: null, hasMore: false, nextCursor: null });
      return;
    }

    const { isLoading, nextCursor, savedArticles } = get();
    if (isLoading) return;

    set({ isLoading: true, error: null });
    try {
      const cursor = reset ? null : nextCursor;
      const response = await fetchFavoritesApi(cursor, 20);
      const merged = reset
        ? response.data
        : [
            ...savedArticles,
            ...response.data.filter(
              (item) => !savedArticles.some((s) => s.id === item.id),
            ),
          ];

      const nextFavs = { ...get().favoriteIds };
      for (const item of merged) {
        nextFavs[item.id] = true;
      }

      set({
        savedArticles: merged,
        favoriteIds: nextFavs,
        nextCursor: response.nextCursor,
        hasMore: response.hasMore,
        isLoading: false,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os artigos salvos.';
      set({ error: msg, isLoading: false });
    }
  },

  toggleBookmark: async (article, isAuthenticated) => {
    const { favoriteIds, savedArticles } = get();
    const currentlySaved = Boolean(favoriteIds[article.id]);
    const nextSaved = !currentlySaved;

    const updatedFavs = { ...favoriteIds, [article.id]: nextSaved };
    const updatedList = nextSaved
      ? [
          {
            ...article,
            userState: {
              isFavorite: true,
              readAt: article.userState?.readAt ?? null,
              hidden: false,
            },
          },
          ...savedArticles.filter((a) => a.id !== article.id),
        ]
      : savedArticles.filter((a) => a.id !== article.id);

    set({ favoriteIds: updatedFavs, savedArticles: updatedList });

    if (isAuthenticated) {
      try {
        await setArticleFavoriteApi(article.id, nextSaved);
      } catch {
        set({ favoriteIds, savedArticles });
      }
    }
  },

  markAsRead: async (articleId, isAuthenticated) => {
    const { readIds } = get();
    if (readIds[articleId]) return;

    set({ readIds: { ...readIds, [articleId]: true } });

    if (isAuthenticated) {
      try {
        await markArticleReadApi(articleId);
      } catch {
        // Mantém estado local de leitura mesmo se offline
      }
    }
  },
}));
