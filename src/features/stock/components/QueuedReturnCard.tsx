import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Card, StatusBadge } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { queuedReturnPhotoProgress, type QueuedReturnPayload } from '@/api';

export interface QueuedReturnCardProps {
  payload: QueuedReturnPayload;
  /** The write queue's status for this row — `failed` stops retrying and needs a person. */
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  lastError: string | null;
}

/** A Return Items save still in the phone's sync queue — no server record (or ID) yet. */
export function QueuedReturnCard({ payload, status, lastError }: QueuedReturnCardProps) {
  const theme = useAppTheme();
  const { uploaded, total } = queuedReturnPhotoProgress(payload);
  const failed = status === 'failed';
  const units = payload.items.reduce((sum, line) => sum + line.qty, 0);
  const progress = `${uploaded} of ${total} photo${total === 1 ? '' : 's'} uploaded`;

  return (
    <Card style={styles.card}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>New return</Text>
        <StatusBadge label={failed ? 'Could not sync' : status === 'syncing' ? 'Syncing' : 'Waiting to sync'} variant={failed ? 'danger' : 'neutral'} />
      </View>
      <Text style={[theme.typography.bodySmall, styles.mt6, { color: theme.colors.text }]} numberOfLines={3}>
        {payload.items.map((line) => `${line.productName} ×${line.qty}`).join(' · ')}
      </Text>
      <Text
        accessibilityLabel={`${failed ? 'Could not sync' : 'Waiting to sync'}, ${progress}`}
        style={[theme.typography.label, styles.mt6, { color: theme.colors.textSecondary }]}>
        {failed ? 'Could not sync' : 'Waiting to sync'} · {progress} · {units} unit{units === 1 ? '' : 's'} · {formatDisplayDate(payload.businessDate)}
      </Text>
      <Text style={[theme.typography.label, styles.mt6, { color: failed ? theme.colors.danger : theme.colors.textFaint }]}>
        {failed ? lastError || 'The server refused this return.' : "Will send automatically once you're back online."}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 8, opacity: 0.9 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mt6: { marginTop: 6 },
});
