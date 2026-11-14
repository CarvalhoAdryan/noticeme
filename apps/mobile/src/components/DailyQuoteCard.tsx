import { Ionicons } from '@expo/vector-icons';
import type { DailyQuoteResponse } from '@dailybrief/shared';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { openArticleInBrowser } from '../utils';

interface DailyQuoteCardProps {
  quote: DailyQuoteResponse;
}

const ZENQUOTES_URL = 'https://zenquotes.io/';

function formatDisplayDate(isoDate: string): string {
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

export function DailyQuoteCard({ quote }: DailyQuoteCardProps) {
  const { colors } = useAppTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <Pressable
        onPress={() => setIsCollapsed((prev) => !prev)}
        accessibilityRole="button"
        accessibilityLabel={
          isCollapsed ? 'Expandir Pensamento do Dia' : 'Recolher Pensamento do Dia'
        }
        style={styles.headerRow}
      >
        <View style={styles.titleRow}>
          <View
            style={[styles.accentDot, { backgroundColor: colors.primary }]}
          />
          <Text style={[styles.eyebrow, { color: colors.primary }]}>
            Pensamento do Dia
          </Text>
          <Text style={[styles.dateText, { color: colors.textSecondary }]}>
            · {formatDisplayDate(quote.display_date)}
          </Text>
          {quote.is_fallback ? (
            <View
              style={[
                styles.fallbackBadge,
                { backgroundColor: colors.surfaceMuted },
              ]}
            >
              <Text
                style={[
                  styles.fallbackBadgeText,
                  { color: colors.textSecondary },
                ]}
              >
                Arquivo
              </Text>
            </View>
          ) : null}
        </View>

        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.textSecondary}
        />
      </Pressable>

      {!isCollapsed ? (
        <View style={styles.body}>
          <Text
            style={[styles.quoteText, { color: colors.text }]}
            numberOfLines={3}
          >
            “{quote.quote}”
          </Text>

          <View style={styles.footerRow}>
            <Text
              style={[styles.authorText, { color: colors.textSecondary }]}
              numberOfLines={1}
            >
              — {quote.author}
            </Text>

            <Pressable
              onPress={() => void openArticleInBrowser(ZENQUOTES_URL)}
              hitSlop={6}
              accessibilityRole="link"
              accessibilityLabel="Inspirado por ZenQuotes"
            >
              <Text
                style={[styles.attributionText, { color: colors.primary }]}
              >
                Via {quote.source}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 28,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
    flex: 1,
  },
  accentDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  dateText: {
    fontSize: 11,
    fontWeight: '600',
  },
  fallbackBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  fallbackBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  body: {
    marginTop: 6,
    gap: 6,
  },
  quoteText: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  authorText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  attributionText: {
    fontSize: 11,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
