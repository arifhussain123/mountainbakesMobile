import { memo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  PURCHASE_DEMAND_STATUS_LABEL,
  PURCHASE_PAYMENT_PREFERENCE_LABEL,
  type PurchaseDemandListRow,
  type WhatsAppConnectionStatus,
  type WhatsAppMessage,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, Icon, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatRelativeTime } from '@/shared/utils';
import {
  DELIVERY_STATUS_LABEL,
  DELIVERY_STATUS_VARIANT,
  DEMAND_STATUS_VARIANT,
  MATCH_STATUS_LABEL,
  MESSAGE_STATUS_LABEL,
  MESSAGE_STATUS_VARIANT,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_VARIANT,
  PRIORITY_LABEL,
  PRIORITY_VARIANT,
  connectionInfo,
  messageError,
  messageText,
} from '../utils/purchasingFormat';
import { LinkButton, Notice } from './FormParts';

/** One demand in the list: number, supplier, the three statuses, totals. */
export const DemandCard = memo(function DemandCardView({ demand, onPress }: { demand: PurchaseDemandListRow; onPress: () => void }) {
  const theme = useAppTheme();
  const billed = demand.billTotal !== null;
  const total = demand.billTotal ?? demand.quotedTotal;
  const failed = demand.lastMessageStatus === 'failed';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${demand.demandNo}, ${demand.supplierName}, ${PURCHASE_DEMAND_STATUS_LABEL[demand.status]}, ${PRIORITY_LABEL[demand.priority]}`}
      onPress={onPress}>
      <Card style={{ marginBottom: 10, borderColor: demand.priority === 'urgent' && demand.status !== 'cancelled' ? `${theme.colors.danger}55` : undefined }}>
        <View style={styles.row}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
            {demand.demandNo}
          </Text>
          <StatusBadge label={PURCHASE_DEMAND_STATUS_LABEL[demand.status] ?? demand.status} variant={DEMAND_STATUS_VARIANT[demand.status] ?? 'neutral'} />
        </View>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]} numberOfLines={1}>
          {demand.supplierName}
        </Text>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>
          Needed {formatDisplayDate(demand.requiredDate)} · {demand.itemCount} item{demand.itemCount === 1 ? '' : 's'} · {PURCHASE_PAYMENT_PREFERENCE_LABEL[demand.paymentPreference]}
        </Text>
        <View style={[styles.badges, { marginTop: 8 }]}>
          <StatusBadge label={PRIORITY_LABEL[demand.priority]} variant={PRIORITY_VARIANT[demand.priority]} />
          {billed ? <StatusBadge label={PAYMENT_STATUS_LABEL[demand.paymentStatus]} variant={PAYMENT_STATUS_VARIANT[demand.paymentStatus]} /> : null}
          {demand.deliveryStatus !== 'not_booked' ? (
            <StatusBadge label={DELIVERY_STATUS_LABEL[demand.deliveryStatus]} variant={DELIVERY_STATUS_VARIANT[demand.deliveryStatus]} />
          ) : null}
          {failed ? <StatusBadge label="Message failed" variant="danger" /> : null}
        </View>
        {total !== null ? (
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 8 }]}>
            {billed ? 'Bill' : 'Quoted'} {formatCurrency(total)}
            {billed && demand.paidTotal > 0 ? ` · Paid ${formatCurrency(demand.paidTotal)}` : ''}
          </Text>
        ) : null}
      </Card>
    </Pressable>
  );
});

/** The WhatsApp connection panel. Test mode is said plainly; no secret is ever shown (the API sends none). */
export function ConnectionStatusCard({ status, loading, error }: { status: WhatsAppConnectionStatus | undefined; loading: boolean; error: boolean }) {
  const theme = useAppTheme();
  if (loading && !status) {
    return (
      <Card style={{ marginBottom: theme.spacing.md }}>
        <ActivityIndicator color={theme.colors.primary} />
      </Card>
    );
  }
  if (!status) {
    return error ? (
      <Card style={{ marginBottom: theme.spacing.md }}>
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>WhatsApp connection status is unavailable right now.</Text>
      </Card>
    ) : null;
  }
  const info = connectionInfo(status);
  return (
    <Card style={{ marginBottom: theme.spacing.md }}>
      <View style={styles.row}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.text, flex: 1 }]}>WhatsApp</Text>
        <StatusBadge label={info.title} variant={info.variant} />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 6 }]}>{info.detail}</Text>
      {info.isTestMode ? <Notice text="Test mode, no real WhatsApp messages are sent." tone="warning" icon="warning" /> : null}
      <View style={[styles.badges, { marginTop: 8 }]}>
        {status.outbox.pending > 0 ? <StatusBadge label={`${status.outbox.pending} sending`} variant="info" /> : null}
        {status.outbox.failed > 0 ? <StatusBadge label={`${status.outbox.failed} failed`} variant="danger" /> : null}
        {status.lastWebhookAt ? <StatusBadge label={`Last contact ${formatRelativeTime(status.lastWebhookAt)}`} variant="neutral" /> : null}
      </View>
    </Card>
  );
}

/** One WhatsApp message, with its delivery status, error and (for a failed outbound one) Retry. */
export function MessageCard({
  message,
  onRetry,
  retrying,
  showDemand,
  showParty,
}: {
  message: WhatsAppMessage;
  onRetry?: () => void;
  retrying?: boolean;
  showDemand?: boolean;
  showParty?: boolean;
}) {
  const theme = useAppTheme();
  const outbound = message.direction === 'outbound';
  const err = message.status === 'failed' ? messageError(message) : null;
  return (
    <View
      style={[
        styles.message,
        {
          alignSelf: outbound ? 'flex-end' : 'flex-start',
          backgroundColor: outbound ? `${theme.colors.primary}1F` : theme.colors.cardFill,
          borderColor: message.status === 'failed' ? theme.colors.danger : theme.colors.cardBorder,
          borderRadius: theme.radii.md,
        },
      ]}>
      <View style={[styles.row, { gap: 6 }]}>
        <Icon name={outbound ? 'send' : 'message-circle'} size={12} color={theme.colors.textSecondary} />
        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, flex: 1 }]} numberOfLines={1}>
          {outbound ? `To ${showParty ? (message.supplierName ?? `+${message.waId}`) : 'supplier'}` : `From ${message.supplierName ?? `+${message.waId}`}`}
          {message.createdByName && outbound ? ` · ${message.createdByName}` : ''}
        </Text>
        <StatusBadge label={MESSAGE_STATUS_LABEL[message.status] ?? message.status} variant={MESSAGE_STATUS_VARIANT[message.status] ?? 'neutral'} />
      </View>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 6 }]}>{messageText(message)}</Text>
      <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
        {formatDisplayDate(message.createdAt.slice(0, 10))} · {formatRelativeTime(message.createdAt)}
        {showDemand && message.demandNo ? ` · ${message.demandNo}` : ''}
        {message.matchStatus && message.matchStatus !== 'matched' && !outbound ? ` · ${MATCH_STATUS_LABEL[message.matchStatus]}` : ''}
        {message.attempts && message.status !== 'failed' && message.attempts > 1 ? ` · attempt ${message.attempts}` : ''}
      </Text>
      {err ? <Text style={[theme.typography.label, { color: theme.colors.danger, marginTop: 4 }]}>{err}</Text> : null}
      {onRetry && message.status === 'failed' && outbound ? (
        <View style={{ marginTop: 8, alignSelf: 'flex-start' }}>
          <LinkButton label={retrying ? 'Retrying…' : 'Retry'} icon="refresh" onPress={onRetry} disabled={retrying} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  message: { borderWidth: 1, padding: 10, marginBottom: 8, maxWidth: '92%', minWidth: '60%' },
});
