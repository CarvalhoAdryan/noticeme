import type { ArticleFeedItem } from '@dailybrief/shared';
import { useRouter } from 'expo-router';
import { useCallback, useEffect } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArticleRow } from '../../src/components/ArticleRow';
import { StateView } from '../../src/components/StateView';
import { useAppTheme } from '../../src/hooks/useAppTheme';
import { useAuthStore } from '../../src/store/auth.store';
import { useBookmarksStore } from '../../src/store/bookmarks.store';
import { openArticleInBrowser } from '../../src/utils';

export default function SavedScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const savedArticles = useBookmarksStore((state) => state.savedArticles);
  const favoriteIds = useBookmarksStore((state) => state.favoriteIds);
  const readIds = useBookmarksStore((state) => state.readIds);
  const hasMore = useBookmarksStore((state) => state.hasMore);
  const isLoading = useBookmarksStore((state) => state.isLoading);
  const error = useBookmarksStore((state) => state.error);
  const loadFavorites = useBookmarksStore((state) => state.loadFavorites);
  const toggleBookmark = useBookmarksStore((state) => state.toggleBookmark);
  const markAsRead = useBookmarksStore((state) => state.markAsRead);

  useEffect(() => {
    void loadFavorites(Boolean(user), true);
  }, [user, loadFavorites]);

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
        <View style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>
            Salvos
          </Text>
          <Text style={[styles.countLabel, { color: colors.textSecondary }]}>
            {savedArticles.length}{' '}
            {savedArticles.length === 1 ? 'artigo' : 'artigos'}
          </Text>
        </View>

        {!user ? (
          <Pressable
            onPress={() => router.push('/(tabs)/profile')}
            accessibilityRole="button"
            accessibilityLabel="Entrar na conta para sincronizar salvos na nuvem"
            style={[
              styles.syncBanner,
              {
                backgroundColor: colors.surfaceMuted,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.syncText, { color: colors.textSecondary }]}>
              Entre na sua conta em{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                Perfil
              </Text>{' '}
              para preservar seus favoritos por mais de 30 dias.
            </Text>
          </Pressable>
        ) : null}
      </View>

      {isLoading && savedArticles.length === 0 ? (
        <StateView
          mode="loading"
          title="Carregando notícias salvas"
          description="Sincronizando sua lista de leitura."
        />
      ) : error && savedArticles.length === 0 ? (
        <StateView
          mode="error"
          title="Não foi possível carregar seus salvos"
          description={error}
          actionLabel="Tentar novamente"
          onAction={() => void loadFavorites(Boolean(user), true)}
        />
      ) : savedArticles.length === 0 ? (
        <StateView
          mode="empty"
          iconName="bookmark-outline"
          title="Sua lista de leitura está vazia"
          description="Toque no ícone de marcador em qualquer manchete para guardar artigos importantes."
          actionLabel="Explorar notícias"
          onAction={() => router.push('/(tabs)')}
        />
      ) : (
        <FlatList
          data={savedArticles}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArticleRow
              article={item}
              isFavorite={Boolean(favoriteIds[item.id] ?? true)}
              isRead={Boolean(readIds[item.id])}
              onPress={handleOpenArticle}
              onToggleFavorite={handleToggleFavorite}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={() => void loadFavorites(Boolean(user), true)}
              tintColor={colors.primary}
            />
          }
          onEndReached={() => {
            if (user && hasMore && !isLoading) {
              void loadFavorites(true, false);
            }
          }}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            isLoading && savedArticles.length > 0 ? (
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  countLabel: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  syncBanner: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  syncText: {
    fontSize: 13,
    lineHeight: 18,
  },
  listContent: {
    paddingBottom: 24,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
});
