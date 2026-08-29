import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useReducedMotion } from '@/common/hooks/useReducedMotion';
import { useTheme } from '@/common/theme/ThemeProvider';
import { radius } from '@/common/theme/radius';
import { space } from '@/common/theme/spacing';

import { PANELS } from '../panels';

/**
 * The page indicator under the first-run panels.
 *
 * ---------------------------------------------------------------------------
 * It counts `PANELS`, and takes no count of its own
 * ---------------------------------------------------------------------------
 * There is no `total` prop. A dot row that can be told a number is a dot row
 * that can be told the wrong one, and "three dots over four panels" is a defect
 * nothing would catch — the screen still works, it just lies about how much is
 * left. Adding a panel adds a dot, and it is not possible to do one without the
 * other.
 *
 * ---------------------------------------------------------------------------
 * On the wave, so the colours are the block's own
 * ---------------------------------------------------------------------------
 * These sit on the plum, not on the field, so the active dot is `onSecondary`
 * and the rest are `onSecondaryMuted` — 10.37:1 and 8.05:1 on the block. The
 * ember is deliberately NOT used: `primary` is a *selectable* accent and one of
 * the five is the plum itself, which on the plum block is a dot you cannot see.
 *
 * ---------------------------------------------------------------------------
 * Silent to a screen reader
 * ---------------------------------------------------------------------------
 * The panel text is what a reader announces, and each page carries its own
 * "N of 3" through `accessibilityLabel` on the page itself. Announcing a row of
 * three dots as well would say the position twice and describe it worse.
 */
const DOT = 8;
/** The active dot stretches rather than growing: a pill reads as "you are here". */
const DOT_ACTIVE = 22;

function Dot({ active }: { active: boolean }): React.ReactElement {
  const theme = useTheme();
  const reduceMotion = useReducedMotion();

  /**
   * `timing.state` — 120ms, the token for a control reporting a change it has
   * already made. Under Reduce Motion the dot arrives at its new width with no
   * tween: the setting asks for the movement to go, not for the indicator to.
   */
  const style = useAnimatedStyle(() => {
    const width = active ? DOT_ACTIVE : DOT;
    const color = active ? theme.colors.onSecondary : theme.colors.onSecondaryMuted;
    if (reduceMotion) return { width, backgroundColor: color, opacity: active ? 1 : 0.55 };
    return {
      width: withTiming(width, theme.motion.timing.state),
      backgroundColor: color,
      opacity: withTiming(active ? 1 : 0.55, theme.motion.timing.state),
    };
  }, [active, reduceMotion, theme]);

  return <Animated.View style={[styles.dot, style]} />;
}

export function OnboardingDots({ index }: { index: number }): React.ReactElement {
  return (
    <View
      style={styles.row}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {PANELS.map((panel, i) => (
        <Dot key={panel.key} active={i === index} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  dot: { height: DOT, borderRadius: radius.pill },
});
