import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { MBPressable } from '@/components/common/MBPressable';
import { useTheme } from '@/theme/ThemeProvider';

export interface MBCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  /**
   * 0–3, and **1 is the default** because v4 gives every card a soft lift.
   *
   * `e1` is v4's card lift — barely there at 7% opacity, and paired with the
   * hairline rather than replacing it. The border is still what separates a
   * card from the field; the shadow only stops white-on-cream from looking
   * pasted on. `0` is for a card that is already inside another surface, where
   * a second lift would double-draw the edge. `2` and `3` are the navigation
   * bar and the centre action button and nothing else. See `theme/shadows.ts`.
   */
  elevation?: 0 | 1 | 2 | 3;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  testID?: string;
}

/** Surface container. The base of every list row, stat tile and form section. */
export function MBCard({
  children,
  onPress,
  elevation = 1,
  style,
  accessibilityLabel,
  testID,
}: MBCardProps): React.ReactElement {
  const theme = useTheme();

  const surface: StyleProp<ViewStyle> = [
    styles.card,
    elevation === 0 ? null : theme.shadows[`e${elevation}` as 'e1' | 'e2' | 'e3'],
    {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.radius.lg,
      padding: theme.layout.cardPad,
      // The hairline is drawn in **both** schemes, not only in dark.
      //
      // It used to be dark-only, because light separated with a shadow alone
      // and a border on top of one double-draws the edge. v4 draws both, and
      // the border is the load-bearing half: a `surface` card on the `bg` field
      // is 1.05:1, which is no edge at all, and `e1` at 7% opacity is a lift
      // rather than a boundary.
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    style,
  ];

  if (!onPress) {
    return (
      <View style={surface} testID={testID} accessibilityLabel={accessibilityLabel}>
        {children}
      </View>
    );
  }

  // The card used to darken to `surfaceSunken` while held. That is gone: the
  // press layer already scales and dims, and a surface doing both at once reads
  // as two separate things happening to one card. Colour is kept for state that
  // outlives a touch — selection, status — not for the touch itself.
  return (
    <MBPressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={surface}>
      {children}
    </MBPressable>
  );
}

const styles = StyleSheet.create({
  /**
   * `overflow: hidden` clips a child to the card's radius — a meter fill, a
   * thumbnail, a status stripe.
   *
   * **On iOS it also clips the shadow**, because RN implements `overflow:
   * hidden` as `masksToBounds`, and a masked layer draws no shadow outside its
   * bounds. So `e1` is invisible on iOS with this structure, and visible on
   * Android, where `elevation` is drawn by the parent and is not masked.
   *
   * The fix is a two-view card: an outer view carrying the shadow and an inner
   * one carrying the clip. It is not done here because the incoming `style`
   * prop would then have to be split between the two — callers pass layout
   * props (`flex`, margins) and visual overrides (padding, background) through
   * the same prop, and every one of ~40 screens would need checking to see
   * which half it meant. iOS has never been built in this project at all (see
   * the README), so this is a recorded trade rather than a live bug: split the
   * view when iOS is first brought up, and audit the `style` call sites then.
   */
  card: { overflow: 'hidden' },
});
