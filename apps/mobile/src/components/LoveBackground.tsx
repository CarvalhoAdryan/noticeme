import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

const DECORATIVE_HEARTS = [
  { top: '8%', left: '10%', size: 28, rotate: '-14deg', opacity: 0.08 },
  { top: '16%', right: '12%', size: 22, rotate: '16deg', opacity: 0.07 },
  { top: '34%', left: '78%', size: 34, rotate: '-8deg', opacity: 0.06 },
  { top: '48%', left: '8%', size: 20, rotate: '20deg', opacity: 0.07 },
  { top: '65%', right: '14%', size: 30, rotate: '-18deg', opacity: 0.08 },
  { top: '82%', left: '18%', size: 26, rotate: '12deg', opacity: 0.07 },
  { top: '88%', right: '22%', size: 18, rotate: '-10deg', opacity: 0.06 },
] as const;

export function LoveBackground() {
  const { preset, colors, isDark } = useAppTheme();

  if (preset !== 'love') {
    return null;
  }

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {DECORATIVE_HEARTS.map((heart, idx) => (
        <View
          key={idx}
          style={[
            styles.heartItem,
            {
              top: heart.top,
              left: 'left' in heart ? heart.left : undefined,
              right: 'right' in heart ? heart.right : undefined,
              opacity: isDark ? heart.opacity * 1.15 : heart.opacity,
              transform: [{ rotate: heart.rotate }],
            },
          ]}
        >
          <Ionicons name="heart" size={heart.size} color={colors.primary} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heartItem: {
    position: 'absolute',
  },
});
