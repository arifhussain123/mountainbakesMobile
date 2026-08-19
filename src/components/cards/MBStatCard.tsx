import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBCard } from '@/components/common/MBCard';
import { MBMoney } from '@/components/common/MBMoney';
import { MBIcon } from '@/components/common/MBIcon';
import type { IconKey } from '@/constants/navigationIcons';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';
import { space } from '@/theme/spacing';

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
   * A quiet leading glyph, drawn at `iconSize.statCard`. It marks the tile in a
   * grid of four; it is never the thing carrying the meaning, which is why it is
   * muted rather than coloured by state.
   */
  icon?: IconKey;
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
  currency = true,
  currencySymbol,
  deltaPct = null,
  onPress,
  loading = false,
  testID,
}: MBStatCardProps): React.ReactElement {
  const theme = useTheme();

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
      // Subtitle rides in the accessible name so a screen reader gets the whole
      // tile in one stop — "Sales: Rs. 1,250, vs last week" — rather than the
      // number and its qualifier as two unrelated announcements.
      accessibilityLabel={`${label}: ${display}${subtitle ? `, ${subtitle}` : ''}`}>
      <View style={styles.body}>
        <View style={styles.heading}>
          <Text
            style={[theme.type.label, styles.flex, { color: theme.colors.textMuted }]}
            numberOfLines={1}>
            {label}
          </Text>
          {icon ? <MBIcon name={icon} size="statCard" color={theme.colors.borderStrong} /> : null}
        </View>

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
  flex: { flex: 1 },
  body: { gap: space.tight },
  // The glyph sits beside the label rather than above the number: the money is
  // the largest thing on the screen and nothing shares its line.
  heading: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  trend: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
});
