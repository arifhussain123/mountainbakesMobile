import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, PhotoViewer, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { BranchReturn } from '@/api';
import { describeReturnValue } from '../returnsSummary';

export interface ReturnStockCardProps {
  item: BranchReturn;
  onChange: () => void;
  onWithdraw: () => void;
}

const STATUS_LABEL: Record<BranchReturn['status'], string> = {
  pending: 'Pending',
  accepted: 'Accepted',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const STATUS_VARIANT: Record<BranchReturn['status'], StatusVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  returned: 'info',
};

const OPEN_STATUSES: BranchReturn['status'][] = ['pending', 'returned'];

/** branchApp.md screen 13 — Return Stock: one product row of a branch-raised return. */
export function ReturnStockCard({ item, onChange, onWithdraw }: ReturnStockCardProps) {
  const theme = useAppTheme();
  const canEdit = OPEN_STATUSES.includes(item.status);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  return (
    <Card style={{ marginBottom: 10 }}>
      <View style={styles.topRow}>
        {item.photo && !photoFailed ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Photo for ${item.productName} return`}
            onPress={() => setPhotoVisible(true)}
            style={[styles.thumbnail, { borderColor: theme.colors.cardBorder }]}>
            <Image source={{ uri: item.photo.url }} style={styles.thumbnailImage} resizeMode="cover" onError={() => setPhotoFailed(true)} />
          </Pressable>
        ) : null}
        <View style={styles.topRowText}>
          <View style={styles.row}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>×{item.qty}</Text>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
            {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
            {describeReturnValue(item)}
          </Text>
          {item.reason ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 6 }]} numberOfLines={2}>
              {item.reason}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.footerRow, { marginTop: 10 }]}>
        <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
        {item.reviewedAt ? (
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1, marginLeft: 8 }]} numberOfLines={1}>
            Reviewed {formatDisplayDate(item.reviewedAt.slice(0, 10))}
          </Text>
        ) : null}
      </View>
      {canEdit ? (
        <View style={styles.actionsRow}>
          <Pressable accessibilityRole="button" onPress={onChange} style={[styles.actionButton, { backgroundColor: theme.colors.border }]}>
            <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Change</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onWithdraw} style={[styles.actionButton, { backgroundColor: `${theme.colors.danger}1A` }]}>
            <Text style={[theme.typography.label, { color: theme.colors.danger, fontWeight: '700' }]}>Withdraw</Text>
          </Pressable>
        </View>
      ) : null}

      <PhotoViewer
        visible={photoVisible}
        uri={item.photo?.url ?? null}
        accessibilityLabel={`Photo for ${item.productName} return`}
        onClose={() => setPhotoVisible(false)}
        onImageError={() => setPhotoFailed(true)}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', gap: 10 },
  topRowText: { flex: 1, minWidth: 0 },
  thumbnail: { width: 56, height: 56, borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  thumbnailImage: { width: '100%', height: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerRow: { flexDirection: 'row', alignItems: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  actionButton: { height: 30, paddingHorizontal: 12, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
});
