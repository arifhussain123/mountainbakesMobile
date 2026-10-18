import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { CashTransfer } from '@/api';
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

/** branchApp.md screen 15 — one branch cash transfer, as a card. No edit/withdraw exists for this resource. */
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
      <Card style={[{ marginBottom: 10 }, highlight ? { borderLeftWidth: 4, borderLeftColor: theme.colors.orange } : null]}>
        <View style={styles.row}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{item.transferNo}</Text>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
        </View>
        {showBranch ? (
          <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
            {item.branchName}
          </Text>
        ) : null}
        <View style={[styles.row, { marginTop: 2, gap: 8 }]}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, flexShrink: 1 }]}>
            {dateLine ?? `${formatDisplayDate(item.date)} · ${formatDisplayTime(item.createdAt)}`}
          </Text>
          <StatusBadge label={STATUS_LABEL[item.status]} variant={STATUS_VARIANT[item.status]} />
        </View>
        {badges && badges.length > 0 ? (
          <View style={styles.badgeRow}>
            {badges.map((b) => (
              <StatusBadge key={b.label} label={b.label} variant={b.variant} />
            ))}
          </View>
        ) : null}

        <ChannelBreakdown cashAmount={item.cashAmount} easypaisaAmount={item.easypaisaAmount} bankAmount={item.bankAmount} fuelCharges={item.fuelCharges} />

        {item.note ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]} numberOfLines={2}>
            {item.note}
          </Text>
        ) : null}
        {item.status === 'rejected' && item.rejectionReason ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 6 }]} numberOfLines={2}>
            {item.rejectionReason}
          </Text>
        ) : null}

        <View style={[styles.footerRow, { marginTop: 10, borderTopColor: theme.colors.cardBorder }]}>
          {photo && !photoFailed ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Payment photo for ${item.transferNo}`} onPress={onPressPhoto}>
              <Image
                source={{ uri: photo.url }}
                style={[styles.thumb, { borderRadius: theme.radii.sm }]}
                onError={() => setFailedUrl(photo.url)}
              />
            </Pressable>
          ) : (
            <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: theme.colors.border, borderRadius: theme.radii.sm }]}>
              <Icon name="image" size={16} color={theme.colors.textFaint} />
            </View>
          )}
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            {item.voucherNo ? (
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {item.voucherNo}
              </Text>
            ) : null}
            {isTransferFinal(item.status) ? (
              <View style={styles.finalRow}>
                <Icon name="lock" size={12} color={theme.colors.textFaint} />
                <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginLeft: 4 }]}>Final</Text>
              </View>
            ) : null}
          </View>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1 },
  thumb: { width: 40, height: 40 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  finalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
});
