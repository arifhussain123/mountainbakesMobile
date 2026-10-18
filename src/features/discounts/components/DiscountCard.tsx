import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchDiscount } from '@/api';
import { DISCOUNT_STATUS_LABEL, DISCOUNT_STATUS_VARIANT, discountChangeActionLabel, isDiscountOpen } from '../utils';

export interface DiscountCardProps {
  item: BranchDiscount;
  onPress?: () => void;
  onChange?: () => void;
  onWithdraw?: () => void;
  /** A pending local sync action disables Change/Withdraw — never stack edits offline. */
  disableActions?: boolean;
  /** Used inside the Request Discount sheet's own "recent requests" list — no actions, no navigation. */
  readOnly?: boolean;
}

function accessibilityDescription(item: BranchDiscount): string {
  const statusLabel = item.status === 'approved' || item.status === 'rejected' ? "Reviewed, can't be changed" : DISCOUNT_STATUS_LABEL[item.status];
  return `Demand ${item.demandNumber}, ${item.amount} rupees, ${statusLabel}, claimed ${formatDisplayDate(item.date)} ${formatDisplayTime(item.createdAt)}`;
}

/** branchApp.md screens 07/14 — one branch discount claim. */
export function DiscountCard({ item, onPress, onChange, onWithdraw, disableActions, readOnly }: DiscountCardProps) {
  const theme = useAppTheme();
  const canEdit = !readOnly && isDiscountOpen(item.status);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityDescription(item)}
      onPress={onPress}
      disabled={!onPress}
      style={{ marginBottom: 10 }}>
      <Card>
        <View style={styles.row}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{item.demandNumber}</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
        </View>
        <View style={[styles.row, { marginTop: 2 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
          </Text>
          <StatusBadge label={DISCOUNT_STATUS_LABEL[item.status] ?? item.status} variant={DISCOUNT_STATUS_VARIANT[item.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]} numberOfLines={2}>
          {item.reason}
        </Text>
        {item.reviewNote ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.warning, marginTop: 6 }]} numberOfLines={2}>
            Production: {item.reviewNote}
          </Text>
        ) : null}

        {!readOnly ? (
          <View style={[styles.footerRow, { marginTop: 10, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }]}>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint }]} numberOfLines={1}>
              {item.id.slice(0, 8)} ·{' '}
              {item.reviewedAt ? `Reviewed ${formatDisplayDate(item.reviewedAt.slice(0, 10))} · ${formatDisplayTime(item.reviewedAt)}` : 'Not reviewed yet'}
            </Text>
          </View>
        ) : null}

        {canEdit ? (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              disabled={disableActions}
              onPress={onChange}
              style={[styles.actionButton, { backgroundColor: theme.colors.border, opacity: disableActions ? 0.5 : 1 }]}>
              <Icon name="pencil" size={12} color={theme.colors.text} />
              <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>{discountChangeActionLabel(item.status)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={disableActions}
              onPress={onWithdraw}
              style={[styles.actionButton, { backgroundColor: `${theme.colors.danger}1A`, opacity: disableActions ? 0.5 : 1 }]}>
              <Icon name="trash" size={12} color={theme.colors.danger} />
              <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>Withdraw</Text>
            </Pressable>
          </View>
        ) : !readOnly ? (
          <View style={[styles.footerRow, { marginTop: 8 }]}>
            <Icon name="lock" size={12} color={theme.colors.textFaint} />
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginLeft: 4 }]}>Final</Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { height: 32, paddingHorizontal: 12, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center' },
});
