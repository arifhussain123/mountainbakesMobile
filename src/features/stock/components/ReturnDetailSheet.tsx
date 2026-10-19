import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { PhotoViewer, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchReturn } from '@/api';
import { LEGACY_SINGLE_PHOTO_NOTE } from '../returnPhotos';
import { shortReturnRef } from '../returnStockList';
import { RETURN_STATUS_LABEL, RETURN_STATUS_VARIANT } from './ReturnStockCard';

export interface ReturnDetailSheetProps {
  item: BranchReturn;
  onChange: () => void;
  onWithdraw: () => void;
}

/**
 * Change / Withdraw are offered only while Production has not decided —
 * `pending` or `returned` — and only on rows this branch raised. The server
 * enforces both (`branch-returns.service.ts`); this decides which buttons draw.
 */
const OPEN_STATUSES: BranchReturn['status'][] = ['pending', 'returned'];

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.colors.border }]}>
      <Text style={[theme.typography.body, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.body, styles.value, { color: theme.colors.text, fontWeight: strong ? '700' : '500' }]}>{value}</Text>
    </View>
  );
}

/** The body of the Return Stock "View" sheet — every field the web's details table carries, for one return. */
export function ReturnDetailSheet({ item, onChange, onWithdraw }: ReturnDetailSheetProps) {
  const theme = useAppTheme();
  const [photoVisible, setPhotoVisible] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const canEdit = OPEN_STATUSES.includes(item.status) && item.source === 'branch';
  const money = (n: number | null | undefined) => (n == null ? 'No price on record' : formatCurrency(n));

  return (
    <View>
      <View style={styles.badgeRow}>
        <StatusBadge label={RETURN_STATUS_LABEL[item.status] ?? item.status} variant={RETURN_STATUS_VARIANT[item.status] ?? 'neutral'} />
        <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{shortReturnRef(item.id)}</Text>
      </View>

      {item.photo && !photoFailed ? (
        <View>
          <Pressable
            accessibilityRole="imagebutton"
            accessibilityLabel={item.legacySinglePhoto ? `Photo of the whole return. ${LEGACY_SINGLE_PHOTO_NOTE}. Open full screen` : `Photo of returned ${item.productName}. Open full screen`}
            onPress={() => setPhotoVisible(true)}>
            <Image source={{ uri: item.photo.url }} style={[styles.photo, { borderColor: theme.colors.cardBorder }]} resizeMode="cover" onError={() => setPhotoFailed(true)} />
          </Pressable>
          {item.legacySinglePhoto ? (
            <Text style={[theme.typography.label, styles.photoNote, { color: theme.colors.textSecondary }]}>{LEGACY_SINGLE_PHOTO_NOTE}</Text>
          ) : null}
        </View>
      ) : null}

      <Row label="Return Date" value={`${formatDisplayDate(item.date)} · ${formatDisplayTime(item.createdAt)}`} />
      <Row label="Product" value={item.productName} strong />
      <Row label="Product Code" value={item.productCode || '—'} />
      <Row label="Returned Qty" value={String(item.qty)} strong />
      <Row label="Unit Price" value={money(item.unitPrice)} />
      <Row label="Return Amount" value={money(item.amount)} strong />
      <Row label="Reason" value={item.reason || '—'} />
      <Row label="Created By" value={item.createdByName || '—'} />
      <Row
        label="Reviewed"
        value={item.reviewedAt ? `${formatDisplayDate(item.reviewedAt.slice(0, 10))}${item.reviewedByName ? ` · ${item.reviewedByName}` : ''}` : 'Awaiting Production'}
      />
      <Text style={[theme.typography.label, styles.note, { color: theme.colors.textFaint }]}>
        Unit price is the product&apos;s price on the return date.
      </Text>

      {canEdit ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onChange} style={[styles.action, { backgroundColor: theme.colors.border, borderRadius: theme.radii.md }]}>
            <Text style={[theme.typography.body, styles.bold, { color: theme.colors.text }]}>Change</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={onWithdraw}
            style={[styles.action, { backgroundColor: `${theme.colors.danger}1A`, borderRadius: theme.radii.md }]}>
            <Text style={[theme.typography.body, styles.bold, { color: theme.colors.danger }]}>Withdraw</Text>
          </Pressable>
        </View>
      ) : (
        <Text style={[theme.typography.label, styles.note, { color: theme.colors.textSecondary }]}>
          {item.source !== 'branch' ? 'Recorded by Production — corrected on their side.' : 'Production has decided this return, so it can no longer be changed.'}
        </Text>
      )}

      <PhotoViewer
        visible={photoVisible}
        uri={item.photo?.url ?? null}
        accessibilityLabel={item.legacySinglePhoto ? `Photo of the whole return. ${LEGACY_SINGLE_PHOTO_NOTE}` : `Photo of returned ${item.productName}`}
        onClose={() => setPhotoVisible(false)}
        onImageError={() => setPhotoFailed(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  photo: { width: '100%', height: 180, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  photoNote: { marginTop: -4, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  value: { flexShrink: 1, textAlign: 'right' },
  note: { marginTop: 10 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  action: { flex: 1, height: 46, alignItems: 'center', justifyContent: 'center' },
  bold: { fontWeight: '700' },
});
