import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useAppTheme } from '@/shared/theme';
import { Icon, type IconName } from '@/shared/ui';
import { TabBadge } from './TabBadge';

export interface TabItemProps {
  label: string;
  icon: IconName;
  active: boolean;
  badgeCount?: number;
  /** "More, opens main menu" vs. the ordinary "Orders, 2 need action" pattern. */
  isMore?: boolean;
  onPress: () => void;
  onPressIn?: () => void;
}

/**
 * One slot in the bar's row. The ACTIVE tab's own slot renders no icon/label
 * (its icon has moved into the raised `ActiveBubble`) but keeps its
 * `Pressable` — tapping an already-active tab still needs to fire (scroll to
 * top / reset that module's stack), so the hit area can't disappear with the
 * icon.
 */
export function TabItem({ label, icon, active, badgeCount, isMore, onPress, onPressIn }: TabItemProps) {
  const theme = useAppTheme();
  const reduceMotion = useReducedMotion();
  const opacity = useSharedValue(active ? 0 : 1);
  const pressScale = useSharedValue(1);

  useEffect(() => {
    const target = active ? 0 : 1;
    opacity.value = reduceMotion ? target : withTiming(target, { duration: 180 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const rowStyle = useAnimatedStyle(() => ({ opacity: opacity.value, transform: [{ scale: pressScale.value }] }));

  const handlePressIn = () => {
    pressScale.value = withTiming(0.92, { duration: 80 });
    onPressIn?.();
  };
  const handlePressOut = () => {
    pressScale.value = withTiming(1, { duration: 80 });
  };

  const accessibilityLabel = isMore ? 'More, opens main menu' : badgeCount ? `${label}, ${badgeCount} need action` : label;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.touchTarget}>
      <Animated.View style={[styles.content, rowStyle]}>
        <View>
          <Icon name={icon} size={22} color={theme.colors.textFaint} />
          <TabBadge count={badgeCount} />
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4, fontSize: 11 }]} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  touchTarget: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  content: { alignItems: 'center', justifyContent: 'center' },
});
