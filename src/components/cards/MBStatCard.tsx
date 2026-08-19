import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { MBCard } from '@/components/common/MBCard';
import { MBIcon } from '@/components/common/MBIcon';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, toNumber } from '@/utils/money';

export interface MBStatCardProps {
  label: string;
  /** Raw value. Accepts the PostgREST numeric string form. */
  value: number | string;
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
    <MBCard onPress={onPress} testID={testID} accessibilityLabel={`${label}: ${display}`}>
      <View style={styles.body}>
        <Text style={[theme.type.label, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {label}
        </Text>

        <Text
          style={[theme.type.money, { color: theme.colors.text }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {loading ? '—' : display}
        </Text>

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
  body: { gap: 6 },
  trend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
