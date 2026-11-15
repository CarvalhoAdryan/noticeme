import type { ArticleFeedItem } from '@dailybrief/shared';
import { create } from 'zustand';
import { ApiError } from '../services/api';
import {
  clearBookmarksCache,
  type PendingFavoriteOp,
  readBookmarksCache,
  writeBookmarksCache,
} from '../services/bookmarksCache';
import {
  fetchFavoritesApi,
  markArticleReadApi,
  setArticleFavoriteApi,
} from '../services/user.service';

interface BookmarksState {
  savedArticles: ArticleFeedItem[];
  favoriteIds: Record<string, boolean>;
  readIds: Record<string, boolean>;
  pendingFavorites: PendingFavoriteOp[];
  isHydrated: boolean;
  nextCursor: string | null;
  hasMore: boolean;
  isLoading: boolean;
  error: string | null;
  hydrateBookmarks: () => Promise<void>;
  clearLocalBookmarks: () => Promise<void>;
  syncFromFeed: (items: ArticleFeedItem[]) => void;
  syncPendingFavorites: () => Promise<void>;
  loadFavorites: (isAuthenticated: boolean, reset?: boolean) => Promise<void>;
  toggleBookmark: (
    article: ArticleFeedItem,
    isAuthenticated: boolean,
  ) => Promise<void>;
  markAsRead: (articleId: string, isAuthenticated: boolean) => Promise<void>;
}

function persistStateSnapshot(state: {
  savedArticles: ArticleFeedItem[];
  favoriteIds: Record<string, boolean>;
  readIds: Record<string, boolean>;
  pendingFavorites: PendingFavoriteOp[];
}): void {
  void writeBookmarksCache({
    savedArticles: state.savedArticles,
    favoriteIds: state.favoriteIds,
    readIds: state.readIds,
    pendingFavorites: state.pendingFavorites,
  });
}

function upsertPendingOp(
  queue: PendingFavoriteOp[],
  article: ArticleFeedItem,
  isFavorite: boolean,
): PendingFavoriteOp[] {
  return [...queue.filter((op) => op.article.id !== article.id), { article, isFavorite }];
}

export const useBookmarksStore = create<BookmarksState>((set, get) => ({
  savedArticles: [],
  favoriteIds: {},
  readIds: {},
  pendingFavorites: [],
  isHydrated: false,
  nextCursor: null,
  hasMore: false,
  isLoading: false,
  error: null,

  hydrateBookmarks: async () => {
    if (get().isHydrated) return;

    const cached = await readBookmarksCache();
    if (!cached) {
      set({ isHydrated: true });
      return;
    }

    const current = get();
    const mergedFavs = { ...cached.favoriteIds, ...current.favoriteIds };
    const mergedReads = { ...cached.readIds, ...current.readIds };
    const mergedSaved =
      current.savedArticles.length > 0
        ? current.savedArticles
        : cached.savedArticles;
    const mergedPending =
      current.pendingFavorites.length > 0
        ? current.pendingFavorites
        : cached.pendingFavorites;

    set({
      savedArticles: mergedSaved,
      favoriteIds: mergedFavs,
      readIds: mergedReads,
      pendingFavorites: mergedPending,
      isHydrated: true,
    });
  },

  clearLocalBookmarks: async () => {
    set({
      savedArticles: [],
      favoriteIds: {},
      readIds: {},
      pendingFavorites: [],
      nextCursor: null,
      hasMore: false,
      error: null,
    });
    await clearBookmarksCache();
  },

  syncFromFeed: (items) => {
    const { favoriteIds, readIds, savedArticles, pendingFavorites } = get();
    const nextFavs = { ...favoriteIds };
    const nextReads = { ...readIds };
    const pendingById = new Map(
      pendingFavorites.map((op) => [op.article.id, op.isFavorite]),
    );

    for (const item of items) {
      if (item.userState) {
        if (item.userState.isFavorite && !pendingById.has(item.id)) {
          nextFavs[item.id] = true;
        }
        if (item.userState.readAt) {
          nextReads[item.id] = true;
        }
      }
    }

    set({ favoriteIds: nextFavs, readIds: nextReads });
    persistStateSnapshot({
      savedArticles,
      favoriteIds: nextFavs,
      readIds: nextReads,
      pendingFavorites,
    });
  },

  syncPendingFavorites: async () => {
    const { pendingFavorites } = get();
    if (pendingFavorites.length === 0) return;

    const remaining: PendingFavoriteOp[] = [];
    for (const op of pendingFavorites) {
      try {
        await setArticleFavoriteApi(op.article.id, op.isFavorite);
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          return;
        }
        remaining.push(op);
      }
    }

    set({ pendingFavorites: remaining });
    const latest = get();
    persistStateSnapshot({
      savedArticles: latest.savedArticles,
      favoriteIds: latest.favoriteIds,
      readIds: latest.readIds,
      pendingFavorites: remaining,
    });
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
      await get().syncPendingFavorites();

      const cursor = reset ? null : nextCursor;
      const response = await fetchFavoritesApi(cursor, 20);
      const currentSaved = get().savedArticles;
      const pendingOps = get().pendingFavorites;
      const pendingRemovedIds = new Set(
        pendingOps.filter((op) => !op.isFavorite).map((op) => op.article.id),
      );
      const pendingAdded = pendingOps
        .filter((op) => op.isFavorite)
        .map((op) => op.article);

      const remoteFiltered = response.data.filter(
        (item) => !pendingRemovedIds.has(item.id),
      );

      let merged = reset
        ? remoteFiltered
        : [
            ...currentSaved,
            ...remoteFiltered.filter(
              (item) => !currentSaved.some((s) => s.id === item.id),
            ),
          ];

      if (reset && pendingAdded.length > 0) {
        merged = [
          ...pendingAdded,
          ...merged.filter(
            (item) => !pendingAdded.some((p) => p.id === item.id),
          ),
        ];
      }

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

      persistStateSnapshot({
        savedArticles: merged,
        favoriteIds: nextFavs,
        readIds: get().readIds,
        pendingFavorites: get().pendingFavorites,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Não foi possível carregar os artigos salvos.';
      set({
        error: savedArticles.length === 0 ? msg : null,
        isLoading: false,
      });
    }
  },

  toggleBookmark: async (article, isAuthenticated) => {
    const { favoriteIds, savedArticles, readIds, pendingFavorites } = get();
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
    persistStateSnapshot({
      savedArticles: updatedList,
      favoriteIds: updatedFavs,
      readIds,
      pendingFavorites,
    });

    if (isAuthenticated) {
      try {
        await setArticleFavoriteApi(article.id, nextSaved);
        const cleanedQueue = get().pendingFavorites.filter(
          (op) => op.article.id !== article.id,
        );
        if (cleanedQueue.length !== get().pendingFavorites.length) {
          set({ pendingFavorites: cleanedQueue });
          persistStateSnapshot({
            savedArticles: get().savedArticles,
            favoriteIds: get().favoriteIds,
            readIds: get().readIds,
            pendingFavorites: cleanedQueue,
          });
        }
      } catch (err: unknown) {
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          set({ favoriteIds, savedArticles });
          persistStateSnapshot({
            savedArticles,
            favoriteIds,
            readIds,
            pendingFavorites,
          });
          return;
        }

        const nextQueue = upsertPendingOp(
          get().pendingFavorites,
          article,
          nextSaved,
        );
        set({ pendingFavorites: nextQueue });
        persistStateSnapshot({
          savedArticles: get().savedArticles,
          favoriteIds: get().favoriteIds,
          readIds: get().readIds,
          pendingFavorites: nextQueue,
        });
      }
    }
  },

  markAsRead: async (articleId, isAuthenticated) => {
    const { readIds, savedArticles, favoriteIds, pendingFavorites } = get();
    if (readIds[articleId]) return;

    const nextReads = { ...readIds, [articleId]: true };
    set({ readIds: nextReads });
    persistStateSnapshot({
      savedArticles,
      favoriteIds,
      readIds: nextReads,
      pendingFavorites,
    });

    if (isAuthenticated) {
      try {
        await markArticleReadApi(articleId);
      } catch {
        // Mantém estado local de leitura mesmo se offline
      }
    }
  },
}));
