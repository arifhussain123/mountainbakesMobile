import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { CashTransfer } from '@/api';
import { FLAT_CARD, TYPE } from '@/features/sales/components';
import { isTransferFinal } from '../calculations';
import { ChannelBreakdown } from './ChannelBreakdown';

export interface TransferCardBadge {
  label: string;
  variant: StatusVariant;
}

export interface TransferCardProps {
  item: CashTransfer;
  onPress: () => void;
  onPressPhoto: () => void;
  /**
   * Finance's review list (screen 03) reuses this card across every branch, so
   * it adds what the branch's own list never needed. All optional — the
   * branch screen passes none of them and renders exactly as before.
   */
  /** Name the branch under the transfer ID. */
  showBranch?: boolean;
  /** Replaces the "date · time" line, e.g. "16 Oct · business day · submitted 17 Oct, 12:19 AM". */
  dateLine?: string;
  /** Extra text badges after the status — match and note checks. Text, never colour alone. */
  badges?: TransferCardBadge[];
  /** An orange left edge — Finance marks the transfers still awaiting a decision. */
  highlight?: boolean;
  /** Replaces the built-in label when the caller can say more (branch, match). */
  accessibilityLabel?: string;
}

const STATUS_LABEL: Record<CashTransfer['status'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
};

const STATUS_VARIANT: Record<CashTransfer['status'], StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

/** Redesign `15 Cash Transfers` — one cash transfer, as a card. No edit/withdraw exists for this resource. */
export function TransferCard({ item, onPress, onPressPhoto, showBranch, dateLine, badges, highlight, accessibilityLabel: labelOverride }: TransferCardProps) {
  const theme = useAppTheme();
  const photo = item.attachments[0];
  // Keyed to the url itself (not a plain boolean) so a refetch that re-mints
  // a fresh signed url — the attachment's url is short-lived by design —
  // automatically clears a previous failure instead of getting stuck showing
  // the placeholder for a photo that would now load fine.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const photoFailed = !!photo && failedUrl === photo.url;
  const accessibilityLabel = labelOverride ?? `Transfer ${item.transferNo}, ${item.amount} rupees, ${STATUS_LABEL[item.status]}, ${formatDisplayDate(item.date)} ${formatDisplayTime(item.createdAt)}${item.fuelCharges > 0 ? ', fuel ' + item.fuelCharges + ' separate' : ''}`;

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} onPress={onPress}>
      <Card style={[FLAT_CARD, styles.card, highlight ? { borderLeftWidth: 4, borderLeftColor: theme.colors.orange } : null]}>
        <View style={styles.row}>
          <View style={styles.grow}>
            <Text style={[TYPE.h3, { color: theme.colors.text }]}>{item.transferNo}</Text>
            {showBranch ? (
              <Text style={[TYPE.sm, { color: theme.colors.text }]} numberOfLines={1}>
                {item.branchName}
              </Text>
            ) : null}
            <Text style={[TYPE.xs, { color: theme.colors.textFaint, marginTop: 2 }]}>
              {dateLine ?? `${formatDisplayDate(item.date)} · ${formatDisplayTime(item.createdAt)}`}
            </Text>
          </View>
          <View style={styles.right}>
            <Text style={[TYPE.amt, styles.total, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
            <StatusBadge label={STATUS_LABEL[item.status]} variant={STATUS_VARIANT[item.status]} />
          </View>
        </View>
        {badges && badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <StatusBadge key={b.label} label={b.label} variant={b.variant} />
            ))}
          </View>
        ) : null}

        <ChannelBreakdown cashAmount={item.cashAmount} easypaisaAmount={item.easypaisaAmount} bankAmount={item.bankAmount} fuelCharges={item.fuelCharges} />

        {item.status === 'rejected' && item.rejectionReason ? (
          <Text style={[TYPE.sm, { color: theme.colors.danger, marginTop: 10 }]} numberOfLines={2}>
            {item.rejectionReason}
          </Text>
        ) : null}

        <View style={styles.footerRow}>
          {photo && !photoFailed ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Payment photo for ${item.transferNo}`} onPress={onPressPhoto}>
              <Image source={{ uri: photo.url }} style={styles.thumb} onError={() => setFailedUrl(photo.url)} />
            </Pressable>
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.colors.border }]}>
              <Icon name="image" size={16} color={theme.colors.textFaint} />
            </View>
          )}
          <Text style={[TYPE.sm, styles.grow, { color: theme.colors.textSecondary }]} numberOfLines={2}>
            {item.note ? `“${item.note}”` : ''}
          </Text>
          <View style={styles.right}>
            {item.voucherNo ? (
              <View style={[styles.voucher, { backgroundColor: `${theme.colors.success}1A` }]}>
                <Text style={[styles.voucherText, { color: theme.colors.success }]} numberOfLines={1}>
                  {item.voucherNo}
                </Text>
              </View>
            ) : item.status === 'pending' ? (
              <Text style={[TYPE.xs, { color: theme.colors.textFaint }]}>Waiting for Finance</Text>
            ) : null}
            {isTransferFinal(item.status) ? (
              <View style={styles.finalRow}>
                <Icon name="lock" size={12} color={theme.colors.textFaint} />
                <Text style={[TYPE.xs, { color: theme.colors.textFaint }]}>Final</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12, paddingVertical: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  right: { alignItems: 'flex-end', gap: 4, flexShrink: 0 },
  total: { fontSize: 17 },
  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  thumb: { width: 40, height: 40, borderRadius: 12 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  voucher: { height: 24, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  voucherText: { fontSize: 11, fontWeight: '600' },
  finalRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});
