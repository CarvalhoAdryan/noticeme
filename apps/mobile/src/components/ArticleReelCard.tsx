import { Ionicons } from '@expo/vector-icons';
import type { ArticleFeedItem } from '@dailybrief/shared';
import {
  Image,
  Pressable,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  sanitizeDisplayText,
} from '../utils';

interface ArticleReelCardProps {
  article: ArticleFeedItem;
  height: number;
  index: number;
  totalCount: number;
  isFavorite: boolean;
  isRead: boolean;
  onReadMore: (article: ArticleFeedItem) => void;
  onToggleFavorite: (article: ArticleFeedItem) => void;
}

export function ArticleReelCard({
  article,
  height,
  index,
  totalCount,
  isFavorite,
  isRead,
  onReadMore,
  onToggleFavorite,
}: ArticleReelCardProps) {
  const { colors } = useAppTheme();
  const primaryCategory = article.categories[0]?.slug;
  const categoryLabel = primaryCategory
    ? CATEGORY_LABELS[primaryCategory]
    : null;
  const relativeAge = formatRelativeTime(article.publishedAt);

  const cleanTitle = sanitizeDisplayText(article.title);
  const rawSummary = sanitizeDisplayText(article.summary || article.description);
  const summaryText =
    rawSummary ||
    'Resumo indisponível no feed RSS. Toque em "Ler matéria completa" para acessar o conteúdo original.';
  const cleanAuthor = sanitizeDisplayText(article.author);

  const handleShare = () => {
    void Share.share({
      message: `${article.title}\n${article.url}`,
      url: article.url,
    }).catch(() => {});
  };

  return (
    <View
      style={[
        styles.page,
        {
          height,
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.mediaContainer,
          { backgroundColor: colors.surfaceMuted },
        ]}
      >
        {article.imageUrl ? (
          <Image
            source={{ uri: article.imageUrl }}
            style={styles.heroImage}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        ) : (
          <View
            style={[
              styles.fallbackBanner,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <View
              style={[
                styles.fallbackAccent,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text style={[styles.fallbackSource, { color: colors.primary }]}>
              {article.source.name}
            </Text>
            {categoryLabel ? (
              <Text
                style={[styles.fallbackCategory, { color: colors.textSecondary }]}
              >
                {categoryLabel}
              </Text>
            ) : null}
          </View>
        )}

        <View
          style={[
            styles.counterPill,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.counterText, { color: colors.text }]}>
            {index + 1} / {totalCount}
          </Text>
        </View>
      </View>

      <View style={styles.contentBody}>
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <Text
              style={[styles.sourceText, { color: colors.primary }]}
              numberOfLines={1}
            >
              {article.source.name}
            </Text>
            {categoryLabel ? (
              <Text
                style={[
                  styles.categoryBadge,
                  {
                    color: colors.text,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                {categoryLabel}
              </Text>
            ) : null}
          </View>

          <View style={styles.metaRight}>
            {isRead ? (
              <Ionicons
                name="checkmark-done-outline"
                size={16}
                color={colors.textSecondary}
              />
            ) : null}
            {relativeAge ? (
              <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                {relativeAge}
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={[styles.title, { color: colors.text }]} numberOfLines={4}>
          {cleanTitle}
        </Text>

        <Text
          style={[styles.summary, { color: colors.textSecondary }]}
          numberOfLines={6}
        >
          {summaryText}
        </Text>

        {cleanAuthor ? (
          <Text
            style={[styles.authorText, { color: colors.textSecondary }]}
            numberOfLines={1}
          >
            Por {cleanAuthor}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.actionBar,
          {
            borderTopColor: colors.border,
            backgroundColor: colors.background,
          },
        ]}
      >
        <Pressable
          onPress={() => onReadMore(article)}
          accessibilityRole="button"
          accessibilityLabel={`Ler mais: ${article.title}`}
          style={({ pressed }) => [
            styles.readMoreButton,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Text style={styles.readMoreText}>Ler matéria completa</Text>
          <Ionicons name="open-outline" size={18} color="#FFFFFF" />
        </Pressable>

        <Pressable
          onPress={() => onToggleFavorite(article)}
          accessibilityRole="button"
          accessibilityLabel={
            isFavorite ? 'Remover dos salvos' : 'Salvar notícia'
          }
          accessibilityState={{ selected: isFavorite }}
          style={[
            styles.iconActionButton,
            {
              backgroundColor: isFavorite ? colors.primarySoft : colors.surface,
              borderColor: isFavorite ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons
            name={isFavorite ? 'bookmark' : 'bookmark-outline'}
            size={22}
            color={isFavorite ? colors.primary : colors.text}
          />
        </Pressable>

        <Pressable
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="Compartilhar notícia"
          style={[
            styles.iconActionButton,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons
            name="share-social-outline"
            size={22}
            color={colors.text}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    width: '100%',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  mediaContainer: {
    width: '100%',
    height: '34%',
    minHeight: 160,
    position: 'relative',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  fallbackBanner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
  },
  fallbackAccent: {
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
  },
  fallbackSource: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  fallbackCategory: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 4,
  },
  counterPill: {
    position: 'absolute',
    right: 14,
    bottom: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  counterText: {
    fontSize: 12,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  contentBody: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  metaRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sourceText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  ageText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  title: {
    fontSize: 23,
    lineHeight: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  summary: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 12,
  },
  authorText: {
    fontSize: 13,
    marginTop: 12,
    fontWeight: '500',
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  readMoreButton: {
    flex: 1,
    minHeight: 50,
    borderRadius: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  readMoreText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  iconActionButton: {
    width: 50,
    height: 50,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

