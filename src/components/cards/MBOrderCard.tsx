import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MBButton } from '../common/MBButton';
import { MBCard } from '../common/MBCard';
import { useTheme } from '@/theme/ThemeProvider';
import { layout, space } from '@/theme/spacing';
import { radius } from '@/theme/radius';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';
import { formatQty } from '@/utils/money';

/**
 * One branch demand, as the production counter reads it.
 *
 * ---------------------------------------------------------------------------
 * This is the production view, and the branch has a different one
 * ---------------------------------------------------------------------------
 * `BranchDemandsScreen` renders the same `BranchProductionOrder` and
 * deliberately does not use this card. Production is deciding what to send, so
 * it needs the branch, the totals and Review/Print; the branch is checking what
 * it is getting, so it needs the per-line approved-vs-requested comparison and
 * a way to withdraw. Same entity, two questions — the same reason
 * `resolveTabScreen` maps one tab name to different screens per role. A single
 * card behind a `variant` flag would be two components sharing a border.
 *
 * ---------------------------------------------------------------------------
 * The status is a word, not only a colour
 * ---------------------------------------------------------------------------
 * The dot carries the `statusColors` token and the label spells the state out,
 * because "awaiting_verification" and "verified" are not distinguishable by hue
 * to everyone, and this is the screen where getting them the wrong way round
 * sends the wrong tray to a shop.
 *
 * Review only appears while the demand is `pending`: it is the one status where
 * quantities can still change, and offering it later would open a sheet whose
 * save the server refuses.
 */

export interface MBOrderCardProps {
  order: BranchProductionOrder;
  /**
   * Handed the order back rather than closing over it at the call site.
   *
   * `React.memo` above is worth nothing against `onReview={() => setReviewing(order)}`:
   * that closure is a new function for every card on every render, so no card
   * can ever bail out and one filter tap re-renders the whole queue. The card
   * binds its own order, which lets the screen hold one stable handler for the
   * entire list.
   */
  onReview: (order: BranchProductionOrder) => void;
  onPrint: (order: BranchProductionOrder) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Waiting',
  awaiting_verification: 'Sent to branch',
  verified: 'Verified by branch',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

export const MBOrderCard = React.memo(function MBOrderCardView({
  order,
  onReview,
  onPrint,
}: MBOrderCardProps): React.ReactElement {
  const theme = useTheme();
  const review = React.useCallback(() => onReview(order), [onReview, order]);
  const print = React.useCallback(() => onPrint(order), [onPrint, order]);
  const statusColor =
    theme.statusColors[order.status as keyof typeof theme.statusColors] ?? theme.colors.textMuted;
  const totalQty = (order.items ?? []).reduce((sum, item) => sum + Number(item.qty ?? 0), 0);

  return (
    <MBCard>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {order.branchName}
          </Text>
          <Text style={[theme.type.mono, { color: theme.colors.textMuted }]}>
            {order.demandNumber}
          </Text>
        </View>
        <View style={styles.statusPill}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[theme.type.caption, { color: theme.colors.text }]}>
            {STATUS_LABEL[order.status] ?? order.status}
          </Text>
        </View>
      </View>

      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {order.date} · {(order.items ?? []).length} products · {formatQty(totalQty)} units
        {order.requiredDate ? ` · needed ${order.requiredDate}` : ''}
      </Text>

      {order.wasChanged ? (
        <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
          Changed{order.changeReason ? `: ${order.changeReason}` : ''}
        </Text>
      ) : null}

      <View style={styles.actions}>
        {order.status === 'pending' ? (
          <MBButton label="Review" onPress={review} size="sm" testID={`review-${order.id}`} />
        ) : null}
        <MBButton label="Print" onPress={print} variant="secondary" size="sm" />
      </View>
    </MBCard>
  );
});

const styles = StyleSheet.create({
  cardTop: { flexDirection: 'row', gap: space.md, marginBottom: space.tight },
  cardMain: { flex: 1, gap: space.hair },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: space.tight },
  dot: { width: layout.dotSize, height: layout.dotSize, borderRadius: radius.pill },
  actions: { flexDirection: 'row', gap: space.sm, marginTop: space.md },
});
