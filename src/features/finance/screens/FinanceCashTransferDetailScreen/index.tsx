import { useState } from 'react';
import { Alert, Image, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import {
  financeCan,
  useApproveFinanceCashTransfer,
  useFinanceCashTransfer,
  useRejectFinanceCashTransfer,
  type CashTransferStatus,
} from '@/api';
import type { FinanceCashTransfersStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import {
  AppHeader,
  ErrorState,
  LoadingSkeleton,
  PrimaryButton,
  Screen,
  SecondaryButton,
  StatusBadge,
  type StatusVariant,
} from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { styles } from './styles';

const STATUS_VARIANT: Record<CashTransferStatus, StatusVariant> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

function Row({ label, value }: { label: string; value: string | number | null }) {
  const theme = useAppTheme();
  if (value === null || value === '') return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

/** mountainbakesFinance.html screen 03's own detail — approve posts an RV- receipt (+ a second under INC-FUEL if fuel charges were entered), or reject with a reason. */
export function FinanceCashTransferDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<FinanceCashTransfersStackParamList, 'FinanceCashTransferDetail'>>();
  const { transferId } = route.params;
  const role = useAuthStore((state) => state.user?.role);

  const { data: transfer, isLoading, error, refetch } = useFinanceCashTransfer(transferId);
  const approve = useApproveFinanceCashTransfer();
  const reject = useRejectFinanceCashTransfer();
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');

  const canApprove = financeCan(role, 'approve');

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Cash Transfer" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={200} />
        </View>
      </Screen>
    );
  }

  if (error || !transfer) {
    return (
      <Screen>
        <AppHeader title="Cash Transfer" />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'Not found'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  const handleApprove = () => {
    approve.mutate(
      { id: transfer.id, input: { note: note.trim() || undefined } },
      { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  const handleReject = () => {
    if (reason.trim().length < 3) {
      Alert.alert('Reason Required', 'Say why this transfer is refused (at least 3 characters).');
      return;
    }
    Alert.alert('Reject Transfer', `Reject ${formatCurrency(transfer.amount)} from ${transfer.branchName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          reject.mutate(
            { id: transfer.id, input: { reason: reason.trim() } },
            { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  return (
    <Screen>
      <AppHeader title={formatCurrency(transfer.amount)} subtitle={transfer.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.row}>
          <StatusBadge label={transfer.status} variant={STATUS_VARIANT[transfer.status]} />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {transfer.transferNo} · {formatDisplayDate(transfer.date)}
          </Text>
        </View>

        <View style={{ marginTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }}>
          <Row label="Cash" value={formatCurrency(transfer.cashAmount)} />
          <Row label="Easypaisa" value={formatCurrency(transfer.easypaisaAmount)} />
          <Row label="Bank" value={formatCurrency(transfer.bankAmount)} />
          <Row label="Fuel Charges" value={formatCurrency(transfer.fuelCharges)} />
          <Row label="Note" value={transfer.note} />
          {transfer.status !== 'pending' ? (
            <>
              <Row label="Voucher No" value={transfer.voucherNo} />
              <Row label={transfer.status === 'approved' ? 'Approved By' : 'Reviewed By'} value={transfer.approvedByName} />
              <Row label="Rejection Reason" value={transfer.rejectionReason} />
            </>
          ) : null}
        </View>

        {transfer.attachments.length > 0 ? (
          <View style={{ marginTop: theme.spacing.lg }}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>PROOF OF DEPOSIT</Text>
            <View style={{ marginTop: 6, aspectRatio: 1, maxWidth: 220, borderRadius: theme.radii.md, overflow: 'hidden' }}>
              <Image source={{ uri: transfer.attachments[0]!.url }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
            </View>
          </View>
        ) : null}

        {transfer.status === 'pending' && canApprove ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>APPROVAL NOTE (OPTIONAL)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Optional note"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { marginTop: 6, borderColor: theme.colors.border, color: theme.colors.text }]}
            />

            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON (REQUIRED TO REJECT)</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Why is this transfer refused?"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[styles.input, { marginTop: 6, height: 72, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
            />

            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Reject" onPress={handleReject} loading={reject.isPending} />
              </View>
              <View style={{ flex: 1 }}>
                <PrimaryButton label="Approve" onPress={handleApprove} loading={approve.isPending} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
