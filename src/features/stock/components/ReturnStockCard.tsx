import { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, ListThumb, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchReturn } from '@/api';
import { LEGACY_SINGLE_PHOTO_NOTE } from '../returnPhotos';
import { describeReturnValue } from '../returnsSummary';
import { shortReturnRef } from '../returnStockList';
import { MiniButton } from './redesign';

export interface ReturnStockCardProps {
  item: BranchReturn;
  /** Position in the list — picks the fallback thumbnail's pastel. */
  index?: number;
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
 * mountainbakesBranch.html screen 13 — one product row of a return: this
 * product's photo thumbnail (or an older return's shared one, noted), product × qty, date · time, what it is worth, then the status,
 * "Reviewed … · ID" and View. The whole card opens the record; Change and
 * Withdraw live there, next to the full detail they act on.
 */
export const ReturnStockCard = memo(function ReturnStockCardView({ item, index = 0, onView }: ReturnStockCardProps) {
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
          {hasPhoto ? (
            <View style={[styles.thumb, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}>
              <Image
                source={{ uri: item.photo!.url }}
                style={styles.thumbImage}
                resizeMode="cover"
                accessibilityLabel={item.legacySinglePhoto ? `Photo of the whole return. ${LEGACY_SINGLE_PHOTO_NOTE}` : `Photo of returned ${item.productName}`}
                onError={() => setPhotoFailed(true)}
              />
            </View>
          ) : (
            <ListThumb icon="rotate-ccw" index={index} />
          )}
          <View style={styles.body}>
            <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
              {item.productName} <Text style={{ color: theme.colors.textFaint }}>×{item.qty}</Text>
            </Text>
            <Text style={[styles.xs, { color: theme.colors.textFaint }]}>
              {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
            </Text>
          </View>
          <StatusBadge label={RETURN_STATUS_LABEL[item.status] ?? item.status} variant={RETURN_STATUS_VARIANT[item.status] ?? 'neutral'} />
        </View>
        <Text style={[styles.value, { color: theme.colors.textSecondary }]} numberOfLines={1}>
          {describeReturnValue(item)}
        </Text>
        {hasPhoto && item.legacySinglePhoto ? (
          <Text style={[styles.xs, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {LEGACY_SINGLE_PHOTO_NOTE}
          </Text>
        ) : null}
        <View style={styles.footer}>
          <Text style={[styles.xs, styles.meta, { color: theme.colors.textFaint }]} numberOfLines={1}>
            {shortReturnRef(item.id)} · {reviewed}
          </Text>
          <MiniButton label="View" onPress={onView} accessibilityLabel={`View ${item.productName} return`} />
        </View>
      </Card>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { marginBottom: 10, paddingHorizontal: 14, paddingVertical: 14, gap: 10, shadowOpacity: 0, elevation: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 44, height: 44, borderRadius: 15, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  body: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  value: { fontSize: 13, lineHeight: 18 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  meta: { flex: 1, minWidth: 0 },
});
