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
  const idle = theme.isDark ? theme.colors.border : '#DCD6F5';

  const style = useAnimatedStyle(() => {
    const input = [index - 1, index, index + 1];
    const width = interpolate(scrollProgress.value, input, [8, 22, 8], 'clamp');
    const backgroundColor = interpolateColor(scrollProgress.value, input, [idle, theme.colors.primary, idle]);
    return { width, backgroundColor };
  });

  return <Animated.View style={[styles.dot, style]} />;
}

/** Redesign B02 — the active page is a 22pt accent pill, the others 8pt dots; animated with the swipe. */
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
