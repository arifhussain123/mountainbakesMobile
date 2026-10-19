import { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PriceChange } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatPercent } from '@/shared/utils';
import {
  PRICE_SOURCE_LABEL,
  PRICE_STATUS_LABEL,
  PRICE_STATUS_VARIANT,
  karachiDay,
  priceChangeA11yLabel,
  priceMove,
  type PriceHint,
} from '../utils/priceHistoryHints';

export interface PriceChangeCardProps {
  change: PriceChange;
  hints: PriceHint[];
  /** This applied change set the price in force now. */
  inForce?: boolean;
  onPress?: () => void;
}

/**
 * One Price History entry. Read-only by design — there is no edit, delete or
 * revert anywhere on it: a price is changed only from the product's Change
 * Price action or a Price List import, and each change is a new row.
 */
export const PriceChangeCard = memo(function PriceChangeCard({ change, hints, inForce, onPress }: PriceChangeCardProps) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState(false);
  const move = priceMove(change);
  const moveColor = move.direction === 'up' ? theme.colors.success : move.direction === 'down' ? theme.colors.danger : theme.colors.textSecondary;
  const reason = change.reason?.trim() ?? '';

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={priceChangeA11yLabel(change, hints)} accessibilityHint="Opens this product's price timeline">
      <Card style={styles.card}>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{change.productName}</Text>
            <View style={styles.metaRow}>
              {change.productCode ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{change.productCode}</Text>
              ) : (
                <View style={[styles.chip, { borderColor: theme.colors.cardBorder }]}>
                  <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>No code</Text>
                </View>
              )}
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>· {change.priceNumber}</Text>
            </View>
          </View>
          <View style={styles.badges}>
            <StatusBadge label={PRICE_STATUS_LABEL[change.status]} variant={PRICE_STATUS_VARIANT[change.status]} />
            {inForce ? <StatusBadge label="Price in force" variant="info" /> : null}
          </View>
        </View>

        <View style={styles.priceRow}>
          <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>
            {change.oldPrice === null ? 'No earlier price' : formatCurrency(change.oldPrice)}
          </Text>
          <Icon name="chevron-right" size={14} color={theme.colors.textSecondary} />
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(change.newPrice)}</Text>
        </View>
        {move.diff !== null && move.direction !== 'same' ? (
          <View style={styles.moveRow}>
            <Icon name={move.direction === 'up' ? 'trending-up' : 'trending-down'} size={14} color={moveColor} />
            <Text style={[theme.typography.label, { color: moveColor, fontWeight: '700' }]}>
              {move.direction === 'up' ? 'Up' : 'Down'} {formatCurrency(Math.abs(move.diff))}
              {move.pct !== null ? ` (${formatPercent(Math.abs(move.pct))})` : ''}
            </Text>
          </View>
        ) : null}

        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]}>
          Effective {formatDisplayDate(change.effectiveDate)}
        </Text>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          Changed {formatDisplayDate(karachiDay(change.changedOn))}
          {change.changedByName ? ` by ${change.changedByName}` : ''} · {PRICE_SOURCE_LABEL[change.source]}
        </Text>

        {reason ? (
          <Pressable
            onPress={() => setExpanded((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={expanded ? 'Show less of the reason' : 'Show the full reason'}
            style={{ marginTop: 8 }}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]} numberOfLines={expanded ? undefined : 2}>
              {reason}
            </Text>
          </Pressable>
        ) : (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 8, fontStyle: 'italic' }]}>No reason given</Text>
        )}

        {hints.length > 0 ? (
          <View style={styles.hintRow}>
            {hints.map((h) => {
              const color = h.tone === 'danger' ? theme.colors.danger : theme.colors.warning;
              return (
                <View key={h.key} style={[styles.hint, { backgroundColor: `${color}1A` }]}>
                  <Icon name="warning" size={11} color={color} />
                  <Text style={[theme.typography.label, { color, fontWeight: '700' }]}>{h.label}</Text>
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  headRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  chip: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 },
  badges: { alignItems: 'flex-end', gap: 4, flexShrink: 0, maxWidth: '45%' },
  priceRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 10 },
  moveRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
});
