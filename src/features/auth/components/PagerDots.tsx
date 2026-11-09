import { Animated, StyleSheet, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface PagerDotsProps {
  count: number;
  /** The pager's horizontal scroll offset — width and color follow it continuously. */
  scrollX: Animated.Value;
  pageWidth: number;
  activeIndex: number;
  testID?: string;
}

const ACTIVE_WIDTH = 18;
const INACTIVE_WIDTH = 4;

/** Active page = a short accent pill, the rest = small grey dots; animates with the swipe. */
export function PagerDots({
  count,
  scrollX,
  pageWidth,
  activeIndex,
  testID,
}: PagerDotsProps) {
  const { colors, withAlpha } = useAppTheme();
  const inactive = withAlpha(colors.textPrimary, 0.25);
  const step = Math.max(pageWidth, 1);

  return (
    <View
      style={styles.row}
      accessible
      accessibilityLabel={`Page ${activeIndex + 1} of ${count}`}
      accessibilityLiveRegion="polite"
      testID={testID}
    >
      {Array.from({ length: count }, (_, index) => {
        const inputRange = [
          (index - 1) * step,
          index * step,
          (index + 1) * step,
        ];
        const width = scrollX.interpolate({
          inputRange,
          outputRange: [INACTIVE_WIDTH, ACTIVE_WIDTH, INACTIVE_WIDTH],
          extrapolate: 'clamp',
        });
        const backgroundColor = scrollX.interpolate({
          inputRange,
          outputRange: [inactive, colors.accent, inactive],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, { width, backgroundColor }]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 5,
    height: 20,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
});
