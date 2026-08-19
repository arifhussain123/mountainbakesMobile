import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { useBreakpoint } from '@/hooks/useBreakpoint';

/**
 * Caps a screen's body at a readable measure and centres it.
 *
 * On a phone the cap is wider than the screen, so this is a no-op and costs one
 * View. That is the point: it goes on unconditionally and there is no
 * `isWide ? …` in any screen. The only thing a screen decides is `wide`, which
 * is a statement about its content, not about the device.
 *
 * ---------------------------------------------------------------------------
 * What it prevents
 * ---------------------------------------------------------------------------
 * Left alone on a 10" tablet, a list row puts its label at the far left and its
 * value at the far right with a hand-span of empty space between them, and body
 * text runs to a measure the eye cannot track back from. That is the "stretched
 * phone layout" that makes an app look unported — and it is not fixed by a
 * tablet-specific screen, it is fixed by not letting one column get that wide.
 *
 * Wrap the **body**, never the header: `MBHeader` spans the full width on
 * purpose so the title, the back affordance and the offline strip stay at the
 * screen edges where they are expected.
 */
export function MBContentWidth({
  children,
  wide = false,
  style,
}: {
  children: React.ReactNode;
  /**
   * Use the two-column cap instead of the single-column one. For content that
   * is genuinely two measures side by side — a dashboard's tile grid, a
   * list-and-detail split — not for a single long column.
   */
  wide?: boolean;
  style?: ViewStyle;
}): React.ReactElement {
  const { maxContentWidth, maxWideWidth } = useBreakpoint();
  return (
    <View style={[styles.fill, { maxWidth: wide ? maxWideWidth : maxContentWidth }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  // `width: '100%'` with `alignSelf: 'center'` rather than `margin: auto`:
  // without the explicit width the view shrink-wraps its content and a short
  // list stops filling the column it was given.
  fill: { flex: 1, width: '100%', alignSelf: 'center' },
});
