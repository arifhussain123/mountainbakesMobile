import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ProductionReturn } from '@/api';

export interface ProductionReturnCardProps {
  item: ProductionReturn;
  onPress: () => void;
}

const STATUS_LABEL: Record<ProductionReturn['status'], string> = {
  pending: 'Awaiting Review',
  accepted: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const STATUS_VARIANT: Record<ProductionReturn['status'], StatusVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  returned: 'neutral',
};

/** mountainbakesProduction.html screen 10 — one returned product, one row. */
export function ProductionReturnCard({ item, onPress }: ProductionReturnCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={{ marginBottom: 8 }}>
        <View style={styles.topRow}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {item.productName}
          </Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>× {item.qty}</Text>
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
          {item.branchName}
        </Text>
        <View style={[styles.topRow, { marginTop: 6 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {item.reason}
          </Text>
          <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
          {item.id.slice(0, 8).toUpperCase()} · {formatDisplayDate(item.date)} · {item.source === 'branch' ? 'Branch' : 'Production'}
        </Text>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
