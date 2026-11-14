import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';

const DECORATIVE_HEARTS = [
  { top: '5%', left: '7%', size: 22, rotate: '-14deg', opacity: 0.14 },
  { top: '9%', right: '10%', size: 26, rotate: '16deg', opacity: 0.13 },
  { top: '18%', left: '46%', size: 18, rotate: '8deg', opacity: 0.12 },
  { top: '26%', left: '12%', size: 28, rotate: '-10deg', opacity: 0.15 },
  { top: '31%', right: '8%', size: 20, rotate: '22deg', opacity: 0.13 },
  { top: '42%', left: '76%', size: 32, rotate: '-8deg', opacity: 0.14 },
  { top: '47%', left: '6%', size: 22, rotate: '18deg', opacity: 0.15 },
  { top: '55%', left: '44%', size: 20, rotate: '-16deg', opacity: 0.12 },
  { top: '62%', right: '12%', size: 28, rotate: '-18deg', opacity: 0.15 },
  { top: '68%', left: '16%', size: 18, rotate: '12deg', opacity: 0.13 },
  { top: '76%', right: '28%', size: 24, rotate: '14deg', opacity: 0.14 },
  { top: '82%', left: '10%', size: 26, rotate: '-12deg', opacity: 0.15 },
  { top: '88%', right: '10%', size: 20, rotate: '-10deg', opacity: 0.14 },
  { top: '92%', left: '52%', size: 16, rotate: '18deg', opacity: 0.12 },
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
              opacity: isDark ? heart.opacity + 0.04 : heart.opacity,
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
