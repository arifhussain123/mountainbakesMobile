import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchReturn } from '@/api';
import { describeReturnValue } from '../returnsSummary';
import { shortReturnRef } from '../returnStockList';

export interface ReturnStockCardProps {
  item: BranchReturn;
  /** Opens the full record (and, while it is still open, Change / Withdraw). */
  onView: () => void;
}

export const RETURN_STATUS_LABEL: Record<BranchReturn['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

export const RETURN_STATUS_VARIANT: Record<BranchReturn['status'], StatusVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  returned: 'info',
};

/**
 * mountainbakesBranch.html screen 13 — one product row of a return: photo
 * thumbnail, product × qty, date · time, what it is worth, then the status,
 * "Reviewed … · ID" and View. The whole card opens the record; Change and
 * Withdraw live there, next to the full detail they act on.
 */
export const ReturnStockCard = memo(function ReturnStockCardView({ item, onView }: ReturnStockCardProps) {
  const theme = useAppTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const hasPhoto = !!item.photo && !photoFailed;
  const reviewed = item.reviewedAt ? `Reviewed ${formatDisplayDate(item.reviewedAt.slice(0, 10))}` : 'Awaiting review';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.productName}, ${item.qty} returned, ${RETURN_STATUS_LABEL[item.status] ?? item.status}. View return`}
      onPress={onView}>
      <Card style={styles.card}>
        <View style={styles.row}>
          <View style={[styles.thumb, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}>
            {hasPhoto ? (
              <Image source={{ uri: item.photo!.url }} style={styles.thumbImage} resizeMode="cover" onError={() => setPhotoFailed(true)} />
            ) : (
              <Icon name="image" size={18} color={theme.colors.textFaint} />
            )}
          </View>
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[theme.typography.cardTitle, styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {item.productName}
              </Text>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>×{item.qty}</Text>
            </View>
            <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.textSecondary }]}>
              {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
            </Text>
            <Text style={[theme.typography.label, styles.mt2, { color: theme.colors.text }]} numberOfLines={1}>
              {describeReturnValue(item)}
            </Text>
            <View style={styles.footer}>
              <StatusBadge label={RETURN_STATUS_LABEL[item.status] ?? item.status} variant={RETURN_STATUS_VARIANT[item.status] ?? 'neutral'} />
              <Text style={[theme.typography.label, styles.meta, { color: theme.colors.textFaint }]} numberOfLines={1}>
                {reviewed} · {shortReturnRef(item.id)}
              </Text>
              <View style={styles.view}>
                <Text style={[theme.typography.label, styles.bold, { color: theme.colors.text }]}>View</Text>
                <Icon name="chevron-right" size={12} color={theme.colors.text} />
              </View>
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 8, padding: 12 },
  row: { flexDirection: 'row', gap: 12 },
  thumb: { width: 54, height: 54, borderRadius: 12, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  body: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 },
  title: { flex: 1, minWidth: 0 },
  mt2: { marginTop: 2 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  meta: { flex: 1, minWidth: 0 },
  view: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  bold: { fontWeight: '700' },
});
