import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';

export interface QueuedDemandCardProps {
  /** The payload `enqueueOfflineWrite` was given — product names aren't resolved client-side (the server does that on create), so this card can only show counts, not line items. */
  payload: { items?: { productId: string; qty: number }[]; packingItems?: { packingMaterialId: string; qty: number }[]; requiredDate?: string };
}

/** A demand still sitting in the local sync queue — no server demand number yet. */
export function QueuedDemandCard({ payload }: QueuedDemandCardProps) {
  const theme = useAppTheme();
  const productCount = payload.items?.length ?? 0;
  const totalQty = (payload.items ?? []).reduce((sum, i) => sum + i.qty, 0);

  return (
    <Card style={{ marginBottom: 10, opacity: 0.85 }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.textSecondary }]}>New demand</Text>
        <StatusBadge label="Waiting to sync" variant="neutral" />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>
        {productCount} product{productCount === 1 ? '' : 's'} · {totalQty} units
        {payload.requiredDate ? ` · Required ${formatDisplayDate(payload.requiredDate)}` : ''}
      </Text>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
        Will submit automatically once you're back online.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
