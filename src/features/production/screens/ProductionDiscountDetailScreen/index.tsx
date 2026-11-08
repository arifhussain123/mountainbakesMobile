import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useProductionDiscounts, useReviewProductionDiscount, useSetProductionDiscountAmount } from '@/api';
import type { ProductionDiscountsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, FormBottomSheet, Icon, PrimaryButton, Screen, SecondaryButton, StatusBadge, TextField } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchDiscount } from '@/api';
import { AmountChangedNote, DiscountDayBreakdown } from '@/features/discounts/components';
import { parseAmountInput, sanitizeAmountInput } from '../../discountAmount';
import { styles } from './styles';

const STATUS_LABEL: Record<BranchDiscount['status'], string> = {
  pending: 'Awaiting Review',
  approved: 'Approved',
  rejected: 'Rejected',
  returned: 'Sent Back',
};

/** mountainbakesProduction.html screen 11's own detail — approve, reject, or send back. */
export function ProductionDiscountDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ProductionDiscountsStackParamList, 'ProductionDiscountDetail'>>();
  const { discountId } = route.params;

  const { data } = useProductionDiscounts();
  const item = useMemo(() => data?.discounts.find((d) => d.id === discountId), [data, discountId]);

  const review = useReviewProductionDiscount();
  const [reviewNote, setReviewNote] = useState('');
  const setAmount = useSetProductionDiscountAmount();
  const amountSheetRef = useRef<BottomSheetModal>(null);
  const [amountDraft, setAmountDraft] = useState('');

  if (!item) {
    return (
      <Screen>
        <AppHeader title="Discount Detail" />
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, padding: theme.spacing.lg }]}>
          This claim is no longer in the list — pull to refresh Discounts and reopen it.
        </Text>
      </Screen>
    );
  }

  const canSendBack = reviewNote.trim().length > 0;
  const draftAmount = parseAmountInput(amountDraft);

  const openAmountSheet = () => {
    setAmountDraft(String(item.amount));
    amountSheetRef.current?.present();
  };

  // Production corrects a claim still awaiting review — typically to the till's
  // figure from Product breakdown (owner's call, 2026-11-06). The branch's own
  // figure is kept and shown under the amount; the branch is notified.
  const handleSaveAmount = () => {
    if (draftAmount <= 0) return;
    if (draftAmount === item.amount) {
      amountSheetRef.current?.dismiss();
      return;
    }
    setAmount.mutate(
      { id: item.id, amount: draftAmount },
      {
        onSuccess: () => amountSheetRef.current?.dismiss(),
        onError: (e) => Alert.alert('Could Not Change Amount', mapErrorToMessage(e)),
      },
    );
  };

  const handleApprove = () => {
    review.mutate(
      { id: item.id, input: { status: 'approved', reviewNote: reviewNote.trim() || undefined } },
      { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Approve', mapErrorToMessage(e)) },
    );
  };

  const handleReject = () => {
    Alert.alert('Reject Claim', `Reject ${formatCurrency(item.amount)} on ${item.demandNumber}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reject',
        style: 'destructive',
        onPress: () =>
          review.mutate(
            { id: item.id, input: { status: 'rejected', reviewNote: reviewNote.trim() || undefined } },
            { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Reject', mapErrorToMessage(e)) },
          ),
      },
    ]);
  };

  const handleSendBack = () => {
    review.mutate(
      { id: item.id, input: { status: 'returned', reviewNote: reviewNote.trim() } },
      { onSuccess: () => navigation.goBack(), onError: (e) => Alert.alert('Could Not Send Back', mapErrorToMessage(e)) },
    );
  };

  return (
    <Screen>
      <AppHeader title={formatCurrency(item.amount)} subtitle={item.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={styles.row}>
          <StatusBadge
            label={STATUS_LABEL[item.status] ?? item.status}
            variant={item.status === 'approved' ? 'success' : item.status === 'pending' ? 'warning' : item.status === 'rejected' ? 'danger' : 'neutral'}
          />
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>
            {item.demandNumber} · {formatDisplayDate(item.date)}
          </Text>
        </View>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={styles.row}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Amount</Text>
            <View style={styles.amountRow}>
              <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
              {item.status === 'pending' ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Edit amount"
                  onPress={openAmountSheet}
                  style={[styles.editButton, { backgroundColor: theme.colors.border }]}>
                  <Icon name="pencil" size={12} color={theme.colors.text} />
                  <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Edit</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
          <AmountChangedNote item={item} />
        </Card>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON</Text>
        <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{item.reason}</Text>

        {item.reviewNote ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              {item.status === 'returned' ? 'WHAT NEEDS CORRECTING' : 'REVIEW NOTE'}
            </Text>
            <Text style={[theme.typography.body, { color: theme.colors.text, marginTop: 4 }]}>{item.reviewNote}</Text>
          </View>
        ) : null}

        {/* The claim's day at the till, per product, against what was claimed. */}
        <DiscountDayBreakdown side="production" branchId={item.branchId} date={item.date} />

        {item.status === 'pending' ? (
          <View>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>
              NOTE (REQUIRED TO SEND BACK)
            </Text>
            <TextInput
              value={reviewNote}
              onChangeText={setReviewNote}
              placeholder="Optional for approve/reject, required to send back"
              placeholderTextColor={theme.colors.textSecondary}
              multiline
              style={[styles.input, { marginTop: 6, height: 72, paddingTop: 10, borderColor: theme.colors.border, color: theme.colors.text }]}
            />

            <View style={styles.actionsRow}>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Reject" onPress={handleReject} loading={review.isPending} />
              </View>
              <View style={{ flex: 1 }}>
                <SecondaryButton label="Send Back" onPress={handleSendBack} loading={review.isPending} disabled={!canSendBack} />
              </View>
              <View style={{ flex: 1.2 }}>
                <PrimaryButton label="Approve" onPress={handleApprove} loading={review.isPending} />
              </View>
            </View>
          </View>
        ) : null}
      </ScrollView>

      <FormBottomSheet
        ref={amountSheetRef}
        title="Edit Amount"
        subtitle={`${item.demandNumber} · ${item.branchName}`}
        snapPoints={['55%']}
        onRequestClose={() => amountSheetRef.current?.dismiss()}>
        <View style={{ gap: theme.spacing.md }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            Branch claimed {formatCurrency(item.originalAmount ?? item.amount)}. The branch is told of the change and its own figure stays on the claim.
          </Text>
          <TextField
            label="New amount (Rs.)"
            required
            value={amountDraft}
            onChangeText={(t) => setAmountDraft(sanitizeAmountInput(t))}
            keyboardType="decimal-pad"
            error={amountDraft !== '' && draftAmount <= 0 ? 'Amount must be more than 0' : undefined}
            testID="discount-amount-input"
          />
          <PrimaryButton label="Save Amount" onPress={handleSaveAmount} loading={setAmount.isPending} disabled={draftAmount <= 0} />
        </View>
      </FormBottomSheet>
    </Screen>
  );
}
