import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card } from '@/shared/ui';
import type { StockRowWithDemand } from '../calculations';
import { MovementRow } from './MovementRow';

export interface StockCardProps {
  row: StockRowWithDemand;
  showDemand: boolean;
}

/**
 * The web table's per-product row, as a card: name + big balance on top, ID
 * underneath, movement columns, and (today only) a "Waiting N · Expected N"
 * line when there's an outstanding production order. A zero-balance card is
 * visually muted rather than hidden (the listing rule already dropped
 * no-activity rows upstream).
 */
export function StockCard({ row, showDemand }: StockCardProps) {
  const theme = useAppTheme();
  const isZero = row.balance === 0;
  const accessibilityLabel = `${row.productName}, balance ${row.balance}, opening ${row.opening}, new ${row.newQty}, sold ${row.sold}`;

  return (
    <Card accessible accessibilityLabel={accessibilityLabel} style={[styles.card, isZero ? { opacity: 0.55 } : null]}>
      <View style={styles.header}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {row.productName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{row.stockCode}</Text>
        </View>
        <Text style={[theme.typography.kpi, { color: isZero ? theme.colors.textSecondary : theme.colors.text }]}>{row.balance}</Text>
      </View>

      <View style={{ marginTop: 10 }}>
        <MovementRow opening={row.opening} newQty={row.newQty} sold={row.sold} returned={row.returned} adjustment={row.adjustment} />
      </View>

      {showDemand && row.waitingDemand > 0 ? (
        <Text style={[theme.typography.label, { color: theme.colors.warning, marginTop: 8, fontWeight: '700' }]}>
          Waiting {row.waitingDemand} · Expected {row.expectedBalance}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
});
