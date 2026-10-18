import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import type { BranchDiscount } from '@/api';

export interface ProductionDiscountCardProps {
  item: BranchDiscount;
  onPress: () => void;
}

const STATUS_LABEL: Record<BranchDiscount['status'], string> = {
  pending: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const STATUS_VARIANT: Record<BranchDiscount['status'], StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  returned: 'neutral',
};

/** mountainbakesProduction.html screen 11 — one branch's discount claim. */
export function ProductionDiscountCard({ item, onPress }: ProductionDiscountCardProps) {
  const theme = useAppTheme();

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={{ marginBottom: 8 }}>
        <View style={styles.row}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
          <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]} numberOfLines={1}>
          {item.reason}
        </Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]} numberOfLines={1}>
          {item.branchName}
        </Text>
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {item.demandNumber} · {item.id.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{formatDisplayDate(item.date)}</Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
