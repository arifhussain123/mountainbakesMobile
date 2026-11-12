import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { FLAT_CARD, SmallButton, TYPE } from '@/features/sales/components';
import type { BranchDiscount } from '@/api';
import { DISCOUNT_STATUS_LABEL, DISCOUNT_STATUS_VARIANT, discountChangeActionLabel, isDiscountOpen } from '../utils';

export interface DiscountCardProps {
  item: BranchDiscount;
  onPress?: () => void;
  onChange?: () => void;
  onWithdraw?: () => void;
  /** A pending local sync action disables Change/Withdraw — never stack edits offline. */
  disableActions?: boolean;
  /**
   * Used inside the Request Discount sheet's own "recent requests" list — no
   * actions, no navigation, drawn as a compact list row (the sheet wraps the
   * rows in one card).
   */
  readOnly?: boolean;
  /** readOnly rows: draws the hairline above every row but the first. */
  divided?: boolean;
}

function accessibilityDescription(item: BranchDiscount): string {
  const statusLabel = item.status === 'approved' || item.status === 'rejected' ? "Reviewed, can't be changed" : DISCOUNT_STATUS_LABEL[item.status];
  return `Demand ${item.demandNumber}, ${item.amount} rupees, ${statusLabel}, claimed ${formatDisplayDate(item.date)} ${formatDisplayTime(item.createdAt)}`;
}

/** Redesign `14 Discounts` / `07 Request Discount` — one branch discount claim. */
export function DiscountCard({ item, onPress, onChange, onWithdraw, disableActions, readOnly, divided }: DiscountCardProps) {
  const theme = useAppTheme();
  const canEdit = !readOnly && isDiscountOpen(item.status);
  const badge = <StatusBadge label={DISCOUNT_STATUS_LABEL[item.status] ?? item.status} variant={DISCOUNT_STATUS_VARIANT[item.status] ?? 'neutral'} />;

  if (readOnly) {
    return (
      <View
        accessible
        accessibilityLabel={accessibilityDescription(item)}
        style={[styles.li, divided ? { borderTopWidth: 1, borderTopColor: theme.colors.border } : null]}>
        <View style={styles.grow}>
          <Text style={[styles.liTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {item.demandNumber} · {formatDisplayDate(item.date)}
          </Text>
          <Text style={[TYPE.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {item.reason}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[TYPE.amt, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
          {badge}
        </View>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityDescription(item)}
      onPress={onPress}
      disabled={!onPress}
      style={styles.wrap}>
      <Card style={[FLAT_CARD, styles.card]}>
        <View style={styles.between}>
          <View style={styles.grow}>
            <Text style={[TYPE.h3s, { color: theme.colors.text }]}>{item.demandNumber}</Text>
            <Text style={[TYPE.xs, { color: theme.colors.textFaint, marginTop: 2 }]}>
              {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[TYPE.amt, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
            {badge}
          </View>
        </View>

        <Text style={[TYPE.p, { color: theme.colors.text }]} numberOfLines={2}>
          “{item.reason}”
        </Text>
        {item.reviewNote ? (
          <Text style={[TYPE.sm, { color: theme.colors.warning }]} numberOfLines={2}>
            Production: {item.reviewNote}
          </Text>
        ) : null}

        <View style={styles.between}>
          <Text style={[TYPE.xs, styles.grow, { color: theme.colors.textFaint }]} numberOfLines={2}>
            {item.id.slice(0, 8)} ·{' '}
            {item.reviewedAt ? `Reviewed ${formatDisplayDate(item.reviewedAt.slice(0, 10))} · ${formatDisplayTime(item.reviewedAt)}` : 'Not reviewed yet'}
          </Text>
          {canEdit ? (
            <View style={styles.actions}>
              <SmallButton kind="secondary" icon="pencil" label={discountChangeActionLabel(item.status)} onPress={onChange} disabled={disableActions} />
              <SmallButton kind="danger" label="Withdraw" onPress={onWithdraw} disabled={disableActions} />
            </View>
          ) : (
            <View style={styles.final}>
              <Icon name="lock" size={12} color={theme.colors.textFaint} />
              <Text style={[TYPE.xs, { color: theme.colors.textFaint }]}>Final</Text>
            </View>
          )}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: { gap: 12, paddingVertical: 14 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  grow: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  actions: { flexDirection: 'row', gap: 8 },
  final: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  liTitle: { fontSize: 14, lineHeight: 19, fontWeight: '600', letterSpacing: -0.2, marginBottom: 2 },
});
