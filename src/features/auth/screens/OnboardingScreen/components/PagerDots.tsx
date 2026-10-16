import { StyleSheet, View } from 'react-native';
import Animated, { interpolate, interpolateColor, useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';

export interface PagerDotsProps {
  count: number;
  /** Current horizontal scroll offset, in page-widths (0 = page 0, 1 = page 1, ...). */
  scrollProgress: SharedValue<number>;
}

function Dot({ index, scrollProgress }: { index: number; scrollProgress: SharedValue<number> }) {
  const theme = useAppTheme();

  const style = useAnimatedStyle(() => {
    const input = [index - 1, index, index + 1];
    const width = interpolate(scrollProgress.value, input, [4, 18, 4], 'clamp');
    const backgroundColor = interpolateColor(scrollProgress.value, input, [theme.colors.border, theme.colors.primary, theme.colors.border]);
    return { width, backgroundColor };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

/** Active page = animated orange pill, inactive = small grey dot — mountainbakesBranch.html's onboarding indicator. */
export function PagerDots({ count, scrollProgress }: PagerDotsProps) {
  return (
    <View style={styles.row} accessible accessibilityRole="none">
      {Array.from({ length: count }).map((_, index) => (
        <Dot key={index} index={index} scrollProgress={scrollProgress} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  dot: { height: 4, borderRadius: 2 },
});
