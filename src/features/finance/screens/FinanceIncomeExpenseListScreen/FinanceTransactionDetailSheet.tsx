import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, Text, TextInput, View } from 'react-native';
import { financeCan, generateIdempotencyKey, useApproveFinanceTransaction, useRejectFinanceTransaction, type FinanceTransaction } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { PhotoViewer, PrimaryButton, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { useAuthStore } from '@/state';
import { useReviewGate } from '../../hooks/useReviewGate';
import { styles } from './styles';

function Row({ label, value }: { label: string; value: string | null }) {
  const theme = useAppTheme();
  if (!value) return null;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10, paddingVertical: 6 }}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', textAlign: 'right', flexShrink: 1 }]}>{value}</Text>
    </View>
  );
}

/**
 * `reachedEnd` comes from the parent sheet's `onScrollEnd` — the scroll view
 * belongs to FormBottomSheet, not to this content.
 */
export function FinanceTransactionDetailSheet({ entry, onClose, reachedEnd = false }: { entry: FinanceTransaction; onClose: () => void; reachedEnd?: boolean }) {
  const theme = useAppTheme();
  const role = useAuthStore((state) => state.user?.role);
  const approve = useApproveFinanceTransaction();
  const reject = useRejectFinanceTransaction();
  const canApprove = financeCan(role, 'approve');
  const [rejectReason, setRejectReason] = useState('');
  // Keyed on entry.id (not a mount-time ref) — this component is reused across
  // different entries as the list screen's `selected` state changes, not remounted.
  const approveKey = useMemo(() => generateIdempotencyKey(`finance_transaction_approve_${entry.id}`), [entry.id]);
  const rejectKey = useMemo(() => generateIdempotencyKey(`finance_transaction_reject_${entry.id}`), [entry.id]);
  const gate = useReviewGate(entry.id);
  const { markScrolledToEnd } = gate;
  useEffect(() => {
    if (reachedEnd) markScrolledToEnd();
  }, [reachedEnd, markScrolledToEnd]);
  const photos = entry.attachments ?? [];
  const [photoUri, setPhotoUri] = useState<string | null>(null);

  const handleReject = () => {
    if (rejectReason.trim().length < 3) {
      Alert.alert('Reason Required', 'Say why this entry is refused (at least 3 characters).');
      return;
    }
    reject.mutate(
      { id: entry.id, reason: rejectReason.trim(), idempotencyKey: rejectKey },
      { onSuccess: onClose, onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
    );
  };

  const handleApprove = () => {
    approve.mutate(
      { id: entry.id, idempotencyKey: approveKey },
      { onSuccess: onClose, onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  return (
    <View>
      <View style={styles.row}>
        <Text style={[theme.typography.screenTitle, { color: entry.txnType === 'income' ? theme.colors.success : theme.colors.danger }]}>
          {formatCurrency(entry.amount)}
        </Text>
        <StatusBadge label={entry.status} variant={entry.status === 'approved' || entry.status === 'posted' ? 'success' : entry.status === 'rejected' ? 'danger' : 'warning'} />
      </View>
      <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{entry.description}</Text>

      <View style={{ marginTop: theme.spacing.lg, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: theme.spacing.sm }}>
        <Row label="Reference" value={entry.txnNo} />
        <Row label="Ledger Head" value={entry.ledgerHeadName} />
        <Row label="Date" value={formatDisplayDate(entry.businessDate)} />
        <Row label="Branch" value={entry.branchName ?? 'Company-wide'} />
        <Row label="Account" value={entry.account === 'bank' ? 'Bank' : 'Cash in Hand'} />
        <Row label="Payment Method" value={entry.paymentMethod} />
        <Row label="Notes" value={entry.notes} />
        <Row label="Submitted By" value={entry.createdByName} />
        <Row label="Reviewed By" value={entry.approvedByName} />
        <Row label="Rejection Reason" value={entry.rejectionReason} />
      </View>

      {photos.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: theme.spacing.md }}>
          {photos.map((p, i) => (
            <Pressable
              key={p.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={`Open photo ${i + 1} of ${photos.length} for ${entry.txnNo}`}
              onPress={() => {
                setPhotoUri(p.url);
                gate.markPhotoOpened();
              }}>
              <Image source={{ uri: p.url }} style={{ width: 72, height: 72, borderRadius: theme.radii.sm, backgroundColor: theme.colors.border }} />
            </Pressable>
          ))}
        </View>
      ) : null}

      {entry.status === 'pending_approval' && canApprove ? (
        <View>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON (REQUIRED TO REJECT)</Text>
          <TextInput
            value={rejectReason}
            onChangeText={setRejectReason}
            placeholder="Why is this entry refused?"
            placeholderTextColor={theme.colors.textSecondary}
            multiline
            style={[styles.input, { marginTop: 6, height: 64, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
          />
          <View style={styles.actionsRow}>
            <View style={{ flex: 1 }}>
              <SecondaryButton label="Reject" onPress={handleReject} loading={reject.isPending} />
            </View>
            <View style={{ flex: 1 }}>
              <PrimaryButton label="Approve" onPress={handleApprove} loading={approve.isPending} disabled={!gate.unlocked} />
            </View>
          </View>
          {gate.hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm, textAlign: 'right' }]}>{gate.hint}</Text> : null}
        </View>
      ) : null}

      <PhotoViewer visible={photoUri !== null} uri={photoUri} accessibilityLabel={`Photo for ${entry.txnNo}`} onClose={() => setPhotoUri(null)} />
    </View>
  );
}
