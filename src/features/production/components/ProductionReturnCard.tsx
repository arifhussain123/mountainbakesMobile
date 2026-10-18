import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge, type StatusVariant } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import type { ProductionReturn } from '@/api';
import { describeReturnValue } from '@/features/stock';

export interface ProductionReturnCardProps {
  item: ProductionReturn;
  onPress: () => void;
}

const STATUS_LABEL: Record<ProductionReturn['status'], string> = {
  pending: 'Awaiting Review',
  accepted: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

const STATUS_VARIANT: Record<ProductionReturn['status'], StatusVariant> = {
  pending: 'warning',
  accepted: 'success',
  rejected: 'danger',
  returned: 'neutral',
};

/**
 * mountainbakesProduction.html screen 10 — one returned product, one row, with
 * the branch's return photo as the 52px tile. Older returns have no photo, and a
 * signed URL can expire (1-hour TTL), so both fall back to the empty tile.
 */
export function ProductionReturnCard({ item, onPress }: ProductionReturnCardProps) {
  const theme = useAppTheme();
  const [photoFailed, setPhotoFailed] = useState(false);
  const photoUri = item.photo && !photoFailed ? item.photo.url : null;

  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card style={[styles.card, { marginBottom: 8 }]}>
        <View style={[styles.thumb, { borderRadius: theme.radii.md, borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.surface }]}>
          {photoUri ? (
            <Image
              source={{ uri: photoUri }}
              style={styles.thumbImage}
              resizeMode="cover"
              accessibilityLabel={`Return photo of ${item.productName}`}
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <Icon name="image" size={18} color={theme.colors.textFaint} />
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.topRow}>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
              {item.productName}
            </Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>× {item.qty}</Text>
          </View>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
            {item.branchName}
          </Text>
          <Text style={[theme.typography.label, { color: theme.colors.text, marginTop: 2 }]} numberOfLines={1}>
            {describeReturnValue(item)}
          </Text>
          <View style={[styles.topRow, { marginTop: 6 }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
              {item.reason}
            </Text>
            <StatusBadge label={STATUS_LABEL[item.status] ?? item.status} variant={STATUS_VARIANT[item.status] ?? 'neutral'} />
          </View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
            {item.id.slice(0, 8).toUpperCase()} · {formatDisplayDate(item.date)} · {item.source === 'branch' ? 'Branch' : 'Production'}
            {item.createdByName ? ` · ${item.createdByName}` : ''}
          </Text>
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12 },
  thumb: { width: 52, height: 52, borderWidth: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  thumbImage: { width: '100%', height: '100%' },
  body: { flex: 1, minWidth: 0 },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
