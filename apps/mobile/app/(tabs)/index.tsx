import type { ArticleFeedItem } from '@dailybrief/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  type LayoutChangeEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArticleReelCard } from '../../src/components/ArticleReelCard';
import { StateView } from '../../src/components/StateView';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { fetchArticles } from '../../src/services/articles.service';
import { useAuthStore } from '../../src/store/auth.store';
import { useBookmarksStore } from '../../src/store/bookmarks.store';
import {
  ALL_CATEGORIES,
  CATEGORY_LABELS,
  openArticleInBrowser,
} from '../../src/utils';

type FeedScope = 'all' | 'followed';

export default function HomeScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);
  const guestCategories = useAuthStore((state) => state.guestCategories);
  const toggleCategory = useAuthStore((state) => state.toggleCategory);

  const favoriteIds = useBookmarksStore((state) => state.favoriteIds);
  const readIds = useBookmarksStore((state) => state.readIds);
  const syncFromFeed = useBookmarksStore((state) => state.syncFromFeed);
  const toggleBookmark = useBookmarksStore((state) => state.toggleBookmark);
  const markAsRead = useBookmarksStore((state) => state.markAsRead);

  const [scope, setScope] = useState<FeedScope>('all');
  const [reelHeight, setReelHeight] = useState(0);
  const [articles, setArticles] = useState<ArticleFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeCategories = user ? user.categories : guestCategories;

  const loadFeed = useCallback(
    async (opts: { reset: boolean; cursor?: string | null }) => {
      if (opts.reset) {
        setError(null);
      }

      try {
        const useServerFollowed = Boolean(user && scope === 'followed');
        const guestFollowed =
          !user && scope === 'followed' ? activeCategories : undefined;

        if (!user && scope === 'followed' && activeCategories.length === 0) {
          setArticles([]);
          setNextCursor(null);
          setHasMore(false);
          return;
        }

        const response = await fetchArticles({
          limit: 20,
          cursor: opts.reset ? null : opts.cursor,
          onlyFollowed: useServerFollowed,
          categories: guestFollowed,
        });

        syncFromFeed(response.data);
        const items = response.data;

        setArticles((prev) => {
          if (opts.reset) return items;
          const existingIds = new Set(prev.map((a) => a.id));
          return [...prev, ...items.filter((a) => !existingIds.has(a.id))];
        });

        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Falha ao carregar o feed de notícias.';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [user, scope, activeCategories, syncFromFeed],
  );

  useEffect(() => {
    setIsLoading(true);
    void loadFeed({ reset: true });
  }, [loadFeed]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadFeed({ reset: true });
  }, [loadFeed]);

  const handleEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !nextCursor) {
      return;
    }
    setIsLoadingMore(true);
    void loadFeed({ reset: false, cursor: nextCursor });
  }, [isLoading, isLoadingMore, hasMore, nextCursor, loadFeed]);

  const handleOpenArticle = useCallback(
    (article: ArticleFeedItem) => {
      void markAsRead(article.id, Boolean(user));
      void openArticleInBrowser(article.url);
    },
    [markAsRead, user],
  );

  const handleToggleFavorite = useCallback(
    (article: ArticleFeedItem) => {
      void toggleBookmark(article, Boolean(user));
    },
    [toggleBookmark, user],
  );

  const handleFeedLayout = useCallback((event: LayoutChangeEvent) => {
    const nextHeight = Math.floor(event.nativeEvent.layout.height);
    if (nextHeight > 0) {
      setReelHeight((prev) => (prev !== nextHeight ? nextHeight : prev));
    }
  }, []);

  const todayFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date());

  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.safeArea, { backgroundColor: colors.background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <View style={styles.mastheadRow}>
          <View>
            <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
              {todayFormatted}
            </Text>
            <Text style={[styles.brandTitle, { color: colors.text }]}>
              NoticeME
            </Text>
          </View>

          <View
            style={[
              styles.scopeSwitch,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Pressable
              onPress={() => setScope('all')}
              accessibilityRole="button"
              accessibilityLabel="Mostrar todas as notícias"
              accessibilityState={{ selected: scope === 'all' }}
              style={[
                styles.scopeButton,
                scope === 'all' && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color:
                      scope === 'all' ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                Últimas
              </Text>
            </Pressable>

            <Pressable
              onPress={() => setScope('followed')}
              accessibilityRole="button"
              accessibilityLabel="Mostrar apenas minhas editorias"
              accessibilityState={{ selected: scope === 'followed' }}
              style={[
                styles.scopeButton,
                scope === 'followed' && { backgroundColor: colors.surface },
              ]}
            >
              <Text
                style={[
                  styles.scopeText,
                  {
                    color:
                      scope === 'followed' ? colors.text : colors.textSecondary,
                  },
                ]}
              >
                Seguindo
              </Text>
            </Pressable>
          </View>
        </View>

        {scope === 'followed' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.followedFiltersRow}
          >
            {ALL_CATEGORIES.map((slug) => {
              const isSelected = activeCategories.includes(slug);
              return (
                <Pressable
                  key={slug}
                  onPress={() => void toggleCategory(slug)}
                  accessibilityRole="button"
                  accessibilityLabel={`Filtrar editoria ${CATEGORY_LABELS[slug]}`}
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: isSelected
                        ? colors.primarySoft
                        : colors.surfaceMuted,
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      {
                        color: isSelected
                          ? colors.primary
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {CATEGORY_LABELS[slug]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>

      <View style={styles.reelViewport} onLayout={handleFeedLayout}>
        {isLoading ? (
          <StateView
            mode="loading"
            title="Atualizando manchetes"
            description="Buscando as últimas publicações das fontes verificadas."
          />
        ) : error && articles.length === 0 ? (
          <StateView
            mode="error"
            title="Não foi possível carregar o feed"
            description={error}
            actionLabel="Tentar novamente"
            onAction={() => {
              setIsLoading(true);
              void loadFeed({ reset: true });
            }}
          />
        ) : articles.length === 0 ? (
          <StateView
            mode="empty"
            title={
              scope === 'followed'
                ? 'Nenhuma notícia nas editorias seguidas'
                : 'Nenhuma notícia publicada ainda'
            }
            description={
              scope === 'followed'
                ? 'Selecione editorias acima ou alterne para Últimas.'
                : 'Execute a coleta de feeds ou aguarde a próxima atualização.'
            }
            actionLabel={
              scope === 'followed' ? 'Ver todas as notícias' : 'Atualizar'
            }
            onAction={() => {
              if (scope === 'followed') {
                setScope('all');
              } else {
                setIsLoading(true);
                void loadFeed({ reset: true });
              }
            }}
          />
        ) : reelHeight > 0 ? (
          <FlatList
            data={articles}
            keyExtractor={(item) => item.id}
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={reelHeight}
            snapToAlignment="start"
            disableIntervalMomentum
            showsVerticalScrollIndicator={false}
            getItemLayout={(_data, index) => ({
              length: reelHeight,
              offset: reelHeight * index,
              index,
            })}
            renderItem={({ item, index }) => (
              <ArticleReelCard
                article={item}
                height={reelHeight}
                index={index}
                totalCount={articles.length}
                isFavorite={Boolean(favoriteIds[item.id])}
                isRead={Boolean(readIds[item.id])}
                onReadMore={handleOpenArticle}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
              />
            }
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            ListFooterComponent={
              isLoadingMore ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : undefined
            }
          />
        ) : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mastheadRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
    marginBottom: 2,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  scopeSwitch: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    padding: 2,
  },
  scopeButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  followedFiltersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 10,
  },
  filterChip: {
    minHeight: 36,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  reelViewport: {
    flex: 1,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
