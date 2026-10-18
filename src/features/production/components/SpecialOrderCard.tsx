import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, PrimaryButton, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { SpecialOrder } from '@/api';

export interface SpecialOrderCardProps {
  order: SpecialOrder;
  onPrepare?: () => void;
  preparing?: boolean;
}

const STATUS_LABEL: Record<SpecialOrder['status'], string> = {
  pending: 'Waiting for Preparation',
  awaiting_verification: 'Prepared — Waiting for Branch Verification',
  verified: 'Verified — Waiting for Approval',
  approved: 'Approved',
};

const STATUS_VARIANT: Record<SpecialOrder['status'], StatusVariant> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'info',
  approved: 'success',
};

/**
 * mountainbakesProduction.html screen 02 — "Special Orders" sub-section: a
 * branch's one-off sent straight to Production, deliberately NOT a demand
 * line and never counted in it (its own `special_orders` resource, migration
 * 143 — not a flag on `production_orders`).
 */
export function SpecialOrderCard({ order, onPrepare, preparing }: SpecialOrderCardProps) {
  const theme = useAppTheme();

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <View style={[styles.pill, { backgroundColor: theme.colors.primary }]}>
          <Text style={[theme.typography.label, { color: theme.colors.primaryText }]}>SPECIAL ORDER</Text>
        </View>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{order.orderNumber}</Text>
      </View>
      <View style={{ marginTop: 8 }}>
        <StatusBadge label={STATUS_LABEL[order.status] ?? order.status} variant={STATUS_VARIANT[order.status] ?? 'neutral'} />
      </View>

      <View style={styles.metaGrid}>
        <View style={styles.metaCell}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>BRANCH</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
            {order.branchName}
          </Text>
        </View>
        <View style={styles.metaCell}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>RAISED</Text>
          <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(order.date)}</Text>
        </View>
        {order.requiredDate ? (
          <View style={styles.metaCell}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>REQUIRED BY</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>
              {formatDisplayDate(order.requiredDate)}
            </Text>
          </View>
        ) : null}
      </View>

      {order.items.map((item) => (
        <View key={item.id} style={[styles.itemBox, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]} numberOfLines={1}>
                {item.itemName}
              </Text>
              {item.description ? (
                <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(item.amount)}</Text>
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 6 }]}>
            Requested <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{item.qty}</Text>
            {item.preparedQty != null ? (
              <>
                {'  '}Prepared <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{item.preparedQty}</Text>
              </>
            ) : null}
          </Text>
          {item.stockTransactionNo ? (
            <View style={styles.inStockRow}>
              <Icon name="check" size={12} color={theme.colors.success} />
              <Text style={[theme.typography.label, { color: theme.colors.success }]}>
                +{item.preparedQty ?? item.qty} in Production Stock · {item.stockTransactionNo}
              </Text>
            </View>
          ) : null}
        </View>
      ))}

      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 8 }]}>
        Raised by {order.createdByName ?? '—'} · {formatDisplayDate(order.date)}
        {order.preparedByName ? `\nPrepared by ${order.preparedByName}` : ''}
      </Text>

      {order.status === 'awaiting_verification' ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>
          Prepared and in Production Stock — it moves to the branch's stock when the branch verifies it with a photo.
        </Text>
      ) : null}

      {order.status === 'pending' && onPrepare ? (
        <View style={{ marginTop: 10 }}>
          <PrimaryButton label="Mark Prepared" onPress={onPrepare} loading={preparing} />
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pill: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6 },
  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 12 },
  metaCell: { minWidth: 90 },
  itemBox: { marginTop: 12, borderRadius: 14, borderWidth: 1, padding: 11 },
  inStockRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
});
