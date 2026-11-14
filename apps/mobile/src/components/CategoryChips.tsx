import type { NewsCategory } from '@dailybrief/shared';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import { ALL_CATEGORIES, CATEGORY_LABELS } from '../utils';

interface CategoryChipsProps {
  selected: NewsCategory | null;
  onSelect: (category: NewsCategory | null) => void;
  includeAllOption?: boolean;
}

export function CategoryChips({
  selected,
  onSelect,
  includeAllOption = true,
}: CategoryChipsProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={[
        styles.wrapper,
        {
          backgroundColor: colors.background,
          borderBottomColor: colors.border,
        },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {includeAllOption ? (
          <Pressable
            onPress={() => onSelect(null)}
            accessibilityRole="button"
            accessibilityLabel="Todas as editorias"
            accessibilityState={{ selected: selected === null }}
            style={[
              styles.chip,
              {
                backgroundColor:
                  selected === null ? colors.text : colors.surfaceMuted,
                borderColor: selected === null ? colors.text : colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.chipText,
                {
                  color: selected === null ? colors.background : colors.text,
                },
              ]}
            >
              Todas
            </Text>
          </Pressable>
        ) : null}

        {ALL_CATEGORIES.map((slug) => {
          const isSelected = selected === slug;
          return (
            <Pressable
              key={slug}
              onPress={() => onSelect(isSelected ? null : slug)}
              accessibilityRole="button"
              accessibilityLabel={`Editoria ${CATEGORY_LABELS[slug]}`}
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? colors.text
                    : colors.surfaceMuted,
                  borderColor: isSelected ? colors.text : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected ? colors.background : colors.text,
                  },
                ]}
              >
                {CATEGORY_LABELS[slug]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

