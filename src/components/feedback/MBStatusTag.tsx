import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';
import type { StatusColorKey } from '@/theme/colors';
import { layout } from '@/theme/spacing';
import { radius } from '@/theme/radius';

export interface MBStatusTagProps {
  /** The word. Always drawn — status is never colour alone. */
  label: string;
  /**
   * A **real backend status value** (`pending`, `verified`, `approved`, …), or
   * nothing for a tag that reports something the server has no enum for
   * (`Unsynced`, `Open`, `Low`).
   *
   * Keyed rather than free-coloured on purpose: `theme.statusColors` is the one
   * map from a status to a hue, so two screens cannot end up drawing `verified`
   * in two different colours. An unknown key falls back to the muted text
   * colour instead of throwing — a status the app has not been taught about
   * should still render its word.
   */
  status?: StatusColorKey;
  testID?: string;
}

/**
 * A status, as a filled pill with a coloured dot.
 *
 * ---------------------------------------------------------------------------
 * The pill shape means "read me", not "tap me"
 * ---------------------------------------------------------------------------
 * v4 keeps two shapes strictly apart: a filter chip is a rounded rectangle
 * (`radius.sm`) because it is chosen between, and a status is a pill because it
 * is read. This is the pill half, and it is deliberately not pressable — the
 * card or row around it is what a tap belongs to.
 *
 * ---------------------------------------------------------------------------
 * Why the fill is neutral and only the dot carries the hue
 * ---------------------------------------------------------------------------
 * v4 gives each status its own pastel — a dark amber on an amber tint, a dark
 * emerald on a mint one — which works because it only ever draws light screens.
 * `theme.statusColors` here is **one map shared by both themes** (it lives in
 * `base` in `themes.ts`), so there is no matching tint that is legible on cream
 * *and* on near-black without splitting the map in two and doubling the number
 * of values that have to stay in step with the server's enum.
 *
 * So the fill is `surfaceSunken` in both schemes and the dot keeps the hue. The
 * word is the primary signal either way, which is the property that matters:
 * `awaiting_verification` and `verified` are one hue apart and sending the
 * wrong tray to a shop is what mixing them up costs.
 *
 * It was inline in `MBOrderCard` before this, at which point the two new stock
 * screens would have made three copies.
 */
export function MBStatusTag({ label, status, testID }: MBStatusTagProps): React.ReactElement {
  const theme = useTheme();
  const dot = status ? theme.statusColors[status] : undefined;

  return (
    <View
      testID={testID}
      style={[
        styles.pill,
        {
          backgroundColor: theme.colors.surfaceSunken,
          borderRadius: theme.radius.pill,
          paddingHorizontal: theme.space.snug,
          paddingVertical: theme.space.xs,
          gap: theme.space.tight,
        },
      ]}>
      {dot ? <View style={[styles.dot, { backgroundColor: dot }]} /> : null}
      <Text style={[theme.type.caption, { color: theme.colors.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
});
