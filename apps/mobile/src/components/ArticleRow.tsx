import { Ionicons } from '@expo/vector-icons';
import type { ArticleFeedItem } from '@dailybrief/shared';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import {
  CATEGORY_LABELS,
  formatRelativeTime,
  sanitizeDisplayText,
} from '../utils';

interface ArticleRowProps {
  article: ArticleFeedItem;
  isFavorite: boolean;
  isRead: boolean;
  onPress: (article: ArticleFeedItem) => void;
  onToggleFavorite: (article: ArticleFeedItem) => void;
}

export function ArticleRow({
  article,
  isFavorite,
  isRead,
  onPress,
  onToggleFavorite,
}: ArticleRowProps) {
  const { colors } = useAppTheme();
  const primaryCategory = article.categories[0]?.slug;
  const categoryLabel = primaryCategory
    ? CATEGORY_LABELS[primaryCategory]
    : null;
  const relativeAge = formatRelativeTime(article.publishedAt);
  const cleanTitle = sanitizeDisplayText(article.title);
  const cleanDescription = sanitizeDisplayText(article.description);

  return (
    <Pressable
      onPress={() => onPress(article)}
      accessibilityRole="button"
      accessibilityLabel={`${article.source.name}, ${cleanTitle}`}
      accessibilityHint="Abre a notícia original no navegador"
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: pressed ? colors.surfaceMuted : colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <View
        style={[
          styles.accentBar,
          {
            backgroundColor: isFavorite
              ? colors.primary
              : isRead
                ? 'transparent'
                : colors.text,
          },
        ]}
      />

      <View style={styles.mainContent}>
        <View style={styles.metaHeader}>
          <View style={styles.metaLeft}>
            <Text
              style={[styles.sourceName, { color: colors.primary }]}
              numberOfLines={1}
            >
              {article.source.name}
            </Text>
            {categoryLabel ? (
              <Text
                style={[
                  styles.categoryBadge,
                  {
                    color: colors.textSecondary,
                    backgroundColor: colors.surfaceMuted,
                  },
                ]}
              >
                {categoryLabel}
              </Text>
            ) : null}
            {relativeAge ? (
              <Text style={[styles.ageText, { color: colors.textSecondary }]}>
                {relativeAge}
              </Text>
            ) : null}
          </View>

          <Pressable
            onPress={() => onToggleFavorite(article)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorite ? 'Remover dos salvos' : 'Salvar notícia para ler depois'
            }
            accessibilityState={{ selected: isFavorite }}
            style={styles.bookmarkButton}
          >
            <Ionicons
              name={isFavorite ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isFavorite ? colors.primary : colors.textSecondary}
            />
          </Pressable>
        </View>

        <View style={styles.bodyRow}>
          <View style={styles.textColumn}>
            <Text
              style={[
                styles.title,
                {
                  color: isRead ? colors.textSecondary : colors.text,
                },
              ]}
              numberOfLines={3}
            >
              {cleanTitle}
            </Text>

            {cleanDescription ? (
              <Text
                style={[styles.description, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {cleanDescription}
              </Text>
            ) : null}
          </View>

          {article.imageUrl ? (
            <Image
              source={{ uri: article.imageUrl }}
              style={[
                styles.thumbnail,
                { backgroundColor: colors.surfaceMuted },
              ]}
              accessibilityIgnoresInvertColors
            />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 14,
    paddingRight: 16,
    paddingLeft: 12,
  },
  accentBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 12,
    marginVertical: 2,
  },
  mainContent: {
    flex: 1,
  },
  metaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  metaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    flex: 1,
    paddingRight: 8,
  },
  sourceName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  categoryBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  ageText: {
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  bookmarkButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: -10,
    marginRight: -8,
  },
  bodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  textColumn: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    lineHeight: 23,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  thumbnail: {
    width: 84,
    height: 84,
    borderRadius: 8,
  },
});

