import { Ionicons } from '@expo/vector-icons';
import type { ArticleFeedItem, NewsCategory } from '@dailybrief/shared';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArticleRow } from '../../src/components/ArticleRow';
import { CategoryChips } from '../../src/components/CategoryChips';
import { StateView } from '../../src/components/StateView';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { fetchArticles } from '../../src/services/articles.service';
import { useAuthStore } from '../../src/store/auth.store';
import { useBookmarksStore } from '../../src/store/bookmarks.store';
import { CATEGORY_LABELS, openArticleInBrowser } from '../../src/utils';

export default function ExploreScreen() {
  const { colors } = useAppTheme();
  const user = useAuthStore((state) => state.user);

  const favoriteIds = useBookmarksStore((state) => state.favoriteIds);
  const readIds = useBookmarksStore((state) => state.readIds);
  const syncFromFeed = useBookmarksStore((state) => state.syncFromFeed);
  const toggleBookmark = useBookmarksStore((state) => state.toggleBookmark);
  const markAsRead = useBookmarksStore((state) => state.markAsRead);

  const [selectedCategory, setSelectedCategory] = useState<NewsCategory | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const [articles, setArticles] = useState<ArticleFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput.trim());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadExplore = useCallback(
    async (opts: { reset: boolean; cursor?: string | null }) => {
      if (opts.reset) {
        setError(null);
      }

      try {
        const response = await fetchArticles({
          limit: 20,
          cursor: opts.reset ? null : opts.cursor,
          category: selectedCategory,
          q: debouncedQuery || undefined,
        });

        syncFromFeed(response.data);

        setArticles((prev) => {
          if (opts.reset) return response.data;
          const existingIds = new Set(prev.map((a) => a.id));
          return [
            ...prev,
            ...response.data.filter((a) => !existingIds.has(a.id)),
          ];
        });

        setNextCursor(response.nextCursor);
        setHasMore(response.hasMore);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : 'Falha ao buscar notícias. Tente novamente.';
        setError(message);
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [selectedCategory, debouncedQuery, syncFromFeed],
  );

  useEffect(() => {
    setIsLoading(true);
    void loadExplore({ reset: true });
  }, [loadExplore]);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    void loadExplore({ reset: true });
  }, [loadExplore]);

  const handleEndReached = useCallback(() => {
    if (isLoading || isLoadingMore || !hasMore || !nextCursor) {
      return;
    }
    setIsLoadingMore(true);
    void loadExplore({ reset: false, cursor: nextCursor });
  }, [isLoading, isLoadingMore, hasMore, nextCursor, loadExplore]);

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

  const hasFilters = Boolean(selectedCategory || debouncedQuery);

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
        <Text style={[styles.screenTitle, { color: colors.text }]}>
          Explorar
        </Text>

        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={20}
            color={colors.textSecondary}
          />
          <TextInput
            value={searchInput}
            onChangeText={setSearchInput}
            placeholder="Buscar por assunto, título ou palavra-chave"
            placeholderTextColor={colors.textSecondary}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Campo de busca de notícias"
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchInput.length > 0 ? (
            <Pressable
              onPress={() => setSearchInput('')}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Limpar busca"
              style={styles.clearButton}
            >
              <Ionicons
                name="close-circle"
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <CategoryChips
        selected={selectedCategory}
        onSelect={setSelectedCategory}
        includeAllOption
      />

      {isLoading ? (
        <StateView
          mode="loading"
          title="Pesquisando notícias"
          description="Consultando o catálogo de editorias e fontes."
        />
      ) : error && articles.length === 0 ? (
        <StateView
          mode="error"
          title="Falha na busca"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => {
            setIsLoading(true);
            void loadExplore({ reset: true });
          }}
        />
      ) : articles.length === 0 ? (
        <StateView
          mode="empty"
          iconName="search-outline"
          title="Nenhum resultado encontrado"
          description={
            debouncedQuery
              ? `Não encontramos notícias para "${debouncedQuery}"${
                  selectedCategory
                    ? ` em ${CATEGORY_LABELS[selectedCategory]}`
                    : ''
                }.`
              : 'Não há notícias nesta editoria no momento.'
          }
          actionLabel={hasFilters ? 'Limpar filtros' : undefined}
          onAction={
            hasFilters
              ? () => {
                  setSearchInput('');
                  setSelectedCategory(null);
                }
              : undefined
          }
        />
      ) : (
        <FlatList
          data={articles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleRow
              article={item}
              isFavorite={Boolean(favoriteIds[item.id])}
              isRead={Boolean(readIds[item.id])}
              onPress={handleOpenArticle}
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
            ) : null
          }
          contentContainerStyle={styles.listContent}
        />
      )}
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
    gap: 10,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  clearButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -8,
  },
  listContent: {
    paddingBottom: 24,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
