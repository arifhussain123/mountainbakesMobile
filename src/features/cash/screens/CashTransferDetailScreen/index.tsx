import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { useCashTransferDetail } from '@/api';
import type { CashStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, Icon, LoadingSkeleton, PhotoViewer, Screen, StatusBadge, type StatusVariant } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import type { CashTransfer } from '@/api';
import { isTransferFinal } from '../../calculations';
import { ChannelBreakdown } from '../../components';
import { styles } from './styles';

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

function Row({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '600' }]}>{value}</Text>
    </View>
  );
}

/** branchApp.md screen 15b — a single cash transfer's full detail. No edit/withdraw exists for this resource — the only client action after create is wait, or resubmit after rejection. */
export function CashTransferDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<CashStackParamList, 'CashTransferDetail'>>();
  const { data: transfer, isLoading, error, refetch } = useCashTransferDetail(route.params.transferId);
  const [photoVisible, setPhotoVisible] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Transfer Detail" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !transfer) {
    return (
      <Screen>
        <AppHeader title="Transfer Detail" />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Transfer not found.'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const photo = transfer.attachments[0];

  return (
    <Screen>
      <AppHeader title={transfer.transferNo} subtitle={`${formatDisplayDate(transfer.date)} · ${formatDisplayTime(transfer.createdAt)}`} />
      <View style={{ padding: theme.spacing.lg }}>
        <Card>
          <View style={styles.headerRow}>
            <Text style={[theme.typography.sectionTitle, { color: theme.colors.text }]}>{formatCurrency(transfer.amount)}</Text>
            <StatusBadge label={STATUS_LABEL[transfer.status]} variant={STATUS_VARIANT[transfer.status]} />
          </View>

          <ChannelBreakdown
            cashAmount={transfer.cashAmount}
            easypaisaAmount={transfer.easypaisaAmount}
            bankAmount={transfer.bankAmount}
            fuelCharges={transfer.fuelCharges}
          />
          {transfer.fuelCharges > 0 ? (
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>Booked separately as fuel income</Text>
          ) : null}

          <View style={{ marginTop: theme.spacing.md }}>
            <Row label="Branch" value={transfer.branchName} />
            {transfer.voucherNo ? <Row label="Voucher" value={transfer.voucherNo} /> : null}
          </View>

          {transfer.note ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>NOTE</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{transfer.note}</Text>
            </View>
          ) : null}

          {transfer.status === 'approved' ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>FINANCE REVIEW</Text>
              <Text style={[theme.typography.body, { color: theme.colors.success, marginTop: 4 }]}>
                Approved by {transfer.approvedByName ?? 'Finance'}
                {transfer.approvedAt ? ` · ${formatDisplayDate(transfer.approvedAt)}` : ''}
              </Text>
              {transfer.approvalNote ? (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{transfer.approvalNote}</Text>
              ) : null}
            </View>
          ) : null}
          {transfer.status === 'rejected' ? (
            <View style={{ marginTop: theme.spacing.md }}>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>FINANCE REVIEW</Text>
              <Text style={[theme.typography.body, { color: theme.colors.danger, marginTop: 4 }]}>Rejected</Text>
              {transfer.rejectionReason ? (
                <Text style={[theme.typography.bodySmall, { color: theme.colors.danger, marginTop: 2 }]}>{transfer.rejectionReason}</Text>
              ) : null}
            </View>
          ) : null}

          {isTransferFinal(transfer.status) ? (
            <View style={styles.finalRow}>
              <Icon name="lock" size={12} color={theme.colors.textFaint} />
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginLeft: 4 }]}>
                Final — there is no edit or withdraw for a reviewed transfer.
              </Text>
            </View>
          ) : (
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: theme.spacing.md }]}>
              Waiting on Finance. A wrong submission is rejected (with a reason) and raised again — it cannot be edited here.
            </Text>
          )}
        </Card>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PAYMENT PHOTO</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Payment photo for ${transfer.transferNo}`}
          onPress={() => setPhotoVisible(true)}
          style={[styles.photoFrame, { marginTop: 8, borderRadius: theme.radii.md, backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder }]}>
          {photo && !photoFailed ? (
            <Image source={{ uri: photo.url }} style={styles.photoImage} resizeMode="cover" onError={() => setPhotoFailed(true)} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <Icon name="image" size={28} color={theme.colors.textFaint} />
              <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 6 }]}>
                {photoFailed ? 'Photo could not load — pull to refresh.' : 'No photo for this transfer.'}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <PhotoViewer
        visible={photoVisible}
        uri={photo?.url ?? null}
        accessibilityLabel={`Payment photo for ${transfer.transferNo}`}
        onClose={() => setPhotoVisible(false)}
        onImageError={() => void refetch()}
      />
    </Screen>
  );
}
