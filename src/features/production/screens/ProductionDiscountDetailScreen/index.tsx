import { useMemo, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useProductionDiscounts, useReviewProductionDiscount } from '@/api';
import type { ProductionDiscountsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, PrimaryButton, Screen, SecondaryButton, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import type { BranchDiscount } from '@/api';
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
    </Screen>
  );
}
