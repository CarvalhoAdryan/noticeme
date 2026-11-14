import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

interface StateViewProps {
  mode: 'loading' | 'empty' | 'error';
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  iconName?: keyof typeof Ionicons.glyphMap;
}

export function StateView({
  mode,
  title,
  description,
  actionLabel,
  onAction,
  iconName,
}: StateViewProps) {
  const { colors } = useAppTheme();

  return (
    <View style={styles.container}>
      {mode === 'loading' ? (
        <ActivityIndicator size="large" color={colors.primary} />
      ) : (
        <Ionicons
          name={
            iconName ??
            (mode === 'error'
              ? 'cloud-offline-outline'
              : 'newspaper-outline')
          }
          size={36}
          color={mode === 'error' ? colors.danger : colors.textSecondary}
        />
      )}

      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>

      {description ? (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: colors.text,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
        >
          <Text style={[styles.buttonText, { color: colors.background }]}>
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 16,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 8,
  },
  button: {
    minHeight: 48,
    minWidth: 160,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
