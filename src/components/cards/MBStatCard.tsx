import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBCard } from '@/components/common/MBCard';
import { MBMoney } from '@/components/common/MBMoney';
import { MBIcon } from '@/components/common/MBIcon';
import type { IconKey } from '@/constants/navigationIcons';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';
import { layout, space } from '@/theme/spacing';
import { iconSize } from '@/theme/iconSizes';

/** The pastel a tile's glyph chip wears. See `tone` on the props. */
export type StatTone = 'brand' | 'success' | 'danger' | 'warning' | 'info';

export interface MBStatCardProps {
  label: string;
  /** Raw value. Accepts the PostgREST numeric string form. */
  value: number | string;
  /**
   * One short line under the figure — what it counts, or what it is measured
   * against ("vs last week", "12 items"). Not a second figure: the tile has one
   * number, and a second one beside it is how a glance stops being a glance.
   */
  subtitle?: string;
  /**
   * The leading glyph, drawn inside a tinted square at the top of the tile.
   *
   * It marks the tile in a grid of four; it is never the thing carrying the
   * meaning. v4 moved it from a muted mark beside the label to a coloured chip
   * above it — see `tone` for what the colour is and, more importantly, what it
   * is not.
   */
  icon?: IconKey;
  /**
   * Which tint the glyph chip wears. **Decorative, and deliberately so.**
   *
   * v4 gives each tile in its dashboard grid a different pastel — green on
   * sales, red on expenses, amber on profit, violet on pending orders — so four
   * tiles can be told apart at a glance in a way four identical white squares
   * cannot. It marks *which tile this is*, not whether its number is good news.
   *
   * That distinction is the thing to hold on to: expenses are red on every
   * dashboard v4 draws, including the ones where expenses fell. Wiring this to
   * a threshold would make the same tile change colour day to day and quietly
   * turn a landmark into an alarm. The figure's own direction is reported by
   * `deltaPct` below, which has the arrow to go with it.
   */
  tone?: StatTone;
  /** Formats value as currency. Off for counts (orders, low-stock items). */
  currency?: boolean;
  /** Tenant symbol from AppSettings; falls back to 'Rs.'. */
  currencySymbol?: string;
  /** Percentage change vs the comparison period. */
  deltaPct?: number | null;
  onPress?: () => void;
  loading?: boolean;
  testID?: string;
}

/**
 * Dashboard figure tile.
 *
 * The delta is coloured by direction, but direction alone is never the only
 * signal — the arrow glyph carries the same meaning for anyone who cannot
 * distinguish the two colours.
 */
export function MBStatCard({
  label,
  value,
  subtitle,
  icon,
  tone = 'brand',
  currency = true,
  currencySymbol,
  deltaPct = null,
  onPress,
  loading = false,
  testID,
}: MBStatCardProps): React.ReactElement {
  const theme = useTheme();

  const TONES: Record<StatTone, { fg: string; bg: string }> = {
    brand: { fg: theme.colors.primary, bg: theme.colors.primarySoft },
    success: { fg: theme.colors.success, bg: theme.colors.successBg },
    danger: { fg: theme.colors.danger, bg: theme.colors.dangerBg },
    warning: { fg: theme.colors.warning, bg: theme.colors.warningBg },
    info: { fg: theme.colors.info, bg: theme.colors.infoBg },
  };
  const chip = TONES[tone];

  const numeric = toNumber(value);
  const display = currency ? formatCurrency(numeric, currencySymbol) : String(value ?? '—');

  const hasDelta = typeof deltaPct === 'number' && Number.isFinite(deltaPct);
  const rising = hasDelta && deltaPct > 0;
  const falling = hasDelta && deltaPct < 0;
  const deltaColor = rising
    ? theme.colors.success
    : falling
    ? theme.colors.danger
    : theme.colors.textMuted;

  return (
    <MBCard
      onPress={onPress}
      testID={testID}
      // A tile is padded tighter than a list card: it holds a glyph, a caption
      // and a figure, and at `cardPad` it is mostly air. See `layout.tilePad`.
      style={styles.tile}
      // Subtitle rides in the accessible name so a screen reader gets the whole
      // tile in one stop — "Sales: Rs. 1,250, vs last week" — rather than the
      // number and its qualifier as two unrelated announcements.
      accessibilityLabel={`${label}: ${display}${subtitle ? `, ${subtitle}` : ''}`}>
      <View style={styles.body}>
        {icon ? (
          <View
            style={[
              styles.chip,
              { backgroundColor: chip.bg, borderRadius: theme.radius.icon },
            ]}>
            <MBIcon name={icon} size="action" color={chip.fg} />
          </View>
        ) : null}

        <Text style={[theme.type.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>

        {/* Money goes through `MBMoney` — the one component that renders
            currency — so a tile and a row can never disagree about the symbol
            or the grouping. A count is not money and keeps its own Text. */}
        {loading ? (
          <Text style={[theme.type.money, { color: theme.colors.text }]}>—</Text>
        ) : currency ? (
          <MBMoney value={numeric} symbol={currencySymbol} numberOfLines={1} adjustsFontSizeToFit />
        ) : (
          <Text
            style={[theme.type.money, { color: theme.colors.text }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.7}>
            {display}
          </Text>
        )}

        {subtitle ? (
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}

        {hasDelta && !loading ? (
          <View style={styles.trend}>
            {/* The arrow is not decoration. Direction must be readable without
                relying on the success/danger colour, which a colourblind user
                cannot separate — so the glyph carries it too. */}
            <MBIcon
              name={rising ? 'trendUp' : falling ? 'trendDown' : 'trendFlat'}
              size="action"
              color={deltaColor}
            />
            <Text style={[theme.type.caption, { color: deltaColor }]}>
              {Math.abs(deltaPct).toFixed(1)}%
            </Text>
          </View>
        ) : null}
      </View>
    </MBCard>
  );
}

const styles = StyleSheet.create({
  tile: { padding: layout.tilePad },
  body: { gap: space.tight },
  /**
   * The glyph sits above the label, not beside it.
   *
   * It used to share the label's line, which was the right call when the mark
   * was a muted 32px outline that would have owned a row of its own. v4's chip
   * is a filled 36px square and a much louder object: on the label's line it
   * competes with the text for the top of the tile, and the eye lands on the
   * colour instead of on what the tile counts. Stacked, the tile reads in the
   * order it should — what this is, then the number, then which way it moved.
   */
  chip: {
    width: iconSize.statCard + 4,
    height: iconSize.statCard + 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  trend: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
