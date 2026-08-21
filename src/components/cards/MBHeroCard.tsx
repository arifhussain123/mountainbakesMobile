import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBMoney } from '@/components/common/MBMoney';
import { useTheme } from '@/theme/ThemeProvider';
import { space } from '@/theme/spacing';

/** One of the small figures in the row under the headline. */
export interface HeroStat {
  label: string;
  /** Already formatted. A hero's supporting figures are counts, percentages and
   *  short money strings, and forcing them all through one formatter would mean
   *  a `type` discriminator on every entry to say which. */
  value: string;
}

export interface MBHeroCardProps {
  /** The line above the figure — a period, a shift window, a week number. */
  caption: string;
  /** Raw value. Accepts the PostgREST numeric string form. */
  value: number | string;
  /** Off for a hero whose headline is a count rather than an amount. */
  currency?: boolean;
  /** Tenant symbol from AppSettings; falls back to the currency constant. */
  currencySymbol?: string;
  /** `Rs. 2.9M` — for a period total that would otherwise wrap. */
  compact?: boolean;
  /** Up to four supporting figures, laid out in a row under the headline. */
  stats?: readonly HeroStat[];
  /**
   * The one highlight the block is allowed — a margin, a delta. Drawn in
   * `onSecondaryAccent`, which is the only warm colour on the block and is
   * therefore the only thing that can outrank the headline for attention. Use
   * it once or not at all.
   */
  highlight?: string;
  testID?: string;
}

/**
 * The deep-brown block a screen's dominant figure sits on.
 *
 * ---------------------------------------------------------------------------
 * Why this is a surface and not a big stat tile
 * ---------------------------------------------------------------------------
 * v4 draws it four times — the day's takings on Sales, the week on Reports, the
 * gross on Daily Sales, the net on Sales vs Expenses — and every time it is the
 * one number the screen exists to show, with two or three qualifiers under it.
 * A white tile cannot do that job on a page of white tiles: it would be the same
 * object as the four cards below it, only larger. Inverting the surface is what
 * makes it read as "the answer" rather than as "the first of several".
 *
 * It is `secondary` rather than `primary` for the reason in `theme/colors.ts`:
 * the ember is a fill for things you press, and a full-width block painted with
 * it reads as an enormous button.
 *
 * ---------------------------------------------------------------------------
 * One figure, and its qualifiers
 * ---------------------------------------------------------------------------
 * `stats` is capped at four by the layout rather than by a check: past that they
 * wrap and the block stops being a glance. They are qualifiers of the headline —
 * how it splits, how many transactions made it — never four unrelated numbers
 * that happen to fit. Four unrelated numbers is what `MBStatGrid` is for.
 *
 * The whole block is one accessibility node. Read out cell by cell it becomes
 * "Cash, 312,400, MoMo, 148,300" with no indication that those are parts of the
 * figure above; read as a sentence it is what a person would say out loud.
 */
export function MBHeroCard({
  caption,
  value,
  currency = true,
  currencySymbol,
  compact = false,
  stats,
  highlight,
  testID,
}: MBHeroCardProps): React.ReactElement {
  const theme = useTheme();

  const spoken = [
    caption,
    String(value),
    ...(stats ?? []).map(s => `${s.label} ${s.value}`),
    highlight ?? '',
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <View
      accessible
      accessibilityLabel={spoken}
      testID={testID}
      style={[
        styles.block,
        {
          backgroundColor: theme.colors.secondary,
          borderRadius: theme.radius.xl,
          padding: theme.layout.cardPad,
          gap: theme.space.md,
        },
      ]}>
      <View style={{ gap: theme.space.hair }}>
        <Text style={[theme.type.label, { color: theme.colors.onSecondaryMuted }]}>{caption}</Text>
        {currency ? (
          <MBMoney
            value={value}
            size="lg"
            compact={compact}
            symbol={currencySymbol}
            color={theme.colors.onSecondary}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
        ) : (
          <Text
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            style={[theme.type.moneyLg, { color: theme.colors.onSecondary }]}>
            {String(value)}
          </Text>
        )}
      </View>

      {stats && stats.length > 0 ? (
        <View style={[styles.stats, { gap: theme.space.xl }]}>
          {stats.map(stat => (
            <View key={stat.label} style={styles.stat}>
              <Text
                numberOfLines={1}
                style={[theme.type.caption, { color: theme.colors.onSecondaryMuted }]}>
                {stat.label}
              </Text>
              <Text
                numberOfLines={1}
                style={[theme.type.number, { color: theme.colors.onSecondary }]}>
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {highlight ? (
        <Text style={[theme.type.label, styles.highlight, { color: theme.colors.onSecondaryAccent }]}>
          {highlight}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // No `overflow: hidden` and no border: the block is its own edge, and it never
  // clips a child — everything in it is text.
  block: {},
  // Wraps rather than shrinking: a supporting figure squeezed to three ellipsed
  // characters is worse than one that moved to a second line.
  stats: { flexDirection: 'row', flexWrap: 'wrap' },
  stat: { gap: space.hair },
  highlight: { alignSelf: 'flex-end' },
});
