import { StyleSheet, Text, View } from 'react-native';
import type { PriceChange } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { PRICE_STATUS_LABEL, PRICE_STATUS_VARIANT, karachiDay, priceMove, type PriceHint } from '../utils/priceHistoryHints';

export interface ProductPriceTimelineProps {
  /** Newest first, as the API returns them. */
  changes: PriceChange[];
  /** The product's live price (`products.price`) — null while it is still loading. */
  currentPrice: number | null;
  hintsFor?: (change: PriceChange) => PriceHint[];
}

/**
 * A product's price as a vertical timeline: the price in force now at the top,
 * then every recorded change, newest first. Shared by the Price History
 * product screen and (later) the Catalog's product detail.
 */
export function ProductPriceTimeline({ changes, currentPrice, hintsFor }: ProductPriceTimelineProps) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={styles.node}>
        <View style={styles.rail}>
          <View style={[styles.dot, styles.dotNow, { backgroundColor: theme.colors.primary }]} />
          {changes.length > 0 ? <View style={[styles.line, { backgroundColor: theme.colors.cardBorder }]} /> : null}
        </View>
        <View style={styles.body}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CURRENT PRICE</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} accessibilityLabel={currentPrice === null ? 'Current price loading' : `Current price ${currentPrice} rupees`}>
            {currentPrice === null ? '—' : formatCurrency(currentPrice)}
          </Text>
        </View>
      </View>

      {changes.map((c, i) => {
        const move = priceMove(c);
        const hints = hintsFor?.(c) ?? [];
        const moveWord = move.direction === 'up' ? 'up' : move.direction === 'down' ? 'down' : 'unchanged';
        return (
          <View
            key={c.id}
            style={styles.node}
            accessible
            accessibilityLabel={[
              `${c.priceNumber}, effective ${formatDisplayDate(c.effectiveDate)}`,
              c.oldPrice === null ? `set to ${c.newPrice} rupees` : `${moveWord} from ${c.oldPrice} to ${c.newPrice} rupees`,
              PRICE_STATUS_LABEL[c.status].toLowerCase(),
              c.reason?.trim() ? `reason: ${c.reason.trim()}` : 'no reason given',
              ...hints.map((h) => h.label),
            ].join(', ')}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: theme.colors.cardBorder, borderColor: theme.colors.textSecondary }]} />
              {i < changes.length - 1 ? <View style={[styles.line, { backgroundColor: theme.colors.cardBorder }]} /> : null}
            </View>
            <View style={styles.body}>
              <View style={styles.titleRow}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700', flexShrink: 1 }]}>
                  {c.oldPrice === null ? '—' : formatCurrency(c.oldPrice)} → {formatCurrency(c.newPrice)}
                </Text>
                <StatusBadge label={PRICE_STATUS_LABEL[c.status]} variant={PRICE_STATUS_VARIANT[c.status]} />
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
                Effective {formatDisplayDate(c.effectiveDate)} · changed {formatDisplayDate(karachiDay(c.changedOn))}
                {c.changedByName ? ` by ${c.changedByName}` : ''} · {c.priceNumber}
              </Text>
              <Text style={[theme.typography.bodySmall, { color: c.reason?.trim() ? theme.colors.text : theme.colors.textSecondary, marginTop: 4 }]}>
                {c.reason?.trim() || 'No reason given'}
              </Text>
              {hints.length > 0 ? (
                <Text style={[theme.typography.label, { color: theme.colors.warning, fontWeight: '700', marginTop: 4 }]}>
                  {hints.map((h) => h.label).join(' · ')}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  node: { flexDirection: 'row', gap: 12 },
  rail: { width: 14, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, borderWidth: 1, marginTop: 5 },
  dotNow: { width: 14, height: 14, borderRadius: 7, borderWidth: 0, marginTop: 3 },
  line: { width: 2, flex: 1, marginTop: 2 },
  body: { flex: 1, paddingBottom: 18 },
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
});
