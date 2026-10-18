import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBranchDiscounts } from '@/api';
import type { DiscountsStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, Screen, StatusBadge } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DISCOUNT_STATUS_LABEL, DISCOUNT_STATUS_VARIANT, discountChangeActionLabel, isDiscountOpen } from '../../utils';
import { useDiscountActions, useHasPendingDiscountAction } from '../../hooks';
import { WithdrawConfirmSheet } from '../../components';
import { RequestDiscountSheetContent } from '../RequestDiscountScreen';
import { styles } from './styles';

/**
 * No "Discount Detail" screen exists in `mountainbakesBranch.html`. There is
 * also no `GET /api/branch-discounts/:id` on the server (confirmed — the web
 * client's own "View" dialog just renders the row already in hand from the
 * list), so this screen does the same: it looks the claim up from the
 * already-fetched `useBranchDiscounts()` cache by id rather than a second
 * network call, mirroring `ProductionOrderDetailScreen`'s convention.
 */
export function DiscountDetailScreen() {
  const theme = useAppTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DiscountsStackParamList, 'DiscountDetail'>>();
  const { discountId } = route.params;

  const { data, isLoading, error, refetch } = useBranchDiscounts();
  const item = useMemo(() => data?.discounts.find((d) => d.id === discountId), [data, discountId]);

  const { withdrawDiscount, isWithdrawing, raceError, clearRaceError } = useDiscountActions();
  const disableActions = useHasPendingDiscountAction(discountId);
  const requestSheetRef = useRef<BottomSheetModal>(null);
  const withdrawSheetRef = useRef<BottomSheetModal>(null);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Discount Claim" />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <AppHeader title="Discount Claim" />
        <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <AppHeader title="Discount Claim" />
        <Text style={[theme.typography.body, { color: theme.colors.textSecondary, padding: theme.spacing.lg }]}>
          This claim is no longer in range — pull to refresh the Discounts list and reopen it.
        </Text>
      </Screen>
    );
  }

  const canEdit = isDiscountOpen(item.status) && !disableActions;

  const handleWithdrawConfirm = async () => {
    const result = await withdrawDiscount(item.id);
    if (result.ok) {
      withdrawSheetRef.current?.dismiss();
      setWithdrawOpen(false);
      navigation.goBack();
    } else if (result.error) {
      Alert.alert('Could Not Withdraw', result.error);
    }
  };

  return (
    <Screen>
      <AppHeader title={item.demandNumber} subtitle={item.branchName} />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <StatusBadge label={DISCOUNT_STATUS_LABEL[item.status] ?? item.status} variant={DISCOUNT_STATUS_VARIANT[item.status] ?? 'neutral'} />
          {!isDiscountOpen(item.status) ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="lock" size={12} color={theme.colors.textFaint} />
              <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Final</Text>
            </View>
          ) : null}
        </View>

        <Card style={{ marginTop: theme.spacing.lg }}>
          <View style={styles.row}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Amount</Text>
            <Text style={[theme.typography.cardTitle, { color: theme.colors.primary }]}>{formatCurrency(item.amount)}</Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Claimed</Text>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>
              {formatDisplayDate(item.date)} · {formatDisplayTime(item.createdAt)}
            </Text>
          </View>
          <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Claim ID</Text>
            <Text style={[theme.typography.body, { color: theme.colors.textFaint }]}>{item.id.slice(0, 8)}</Text>
          </View>
          {item.reviewedAt ? (
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Reviewed</Text>
              <Text style={[theme.typography.body, { color: theme.colors.text }]}>
                {formatDisplayDate(item.reviewedAt.slice(0, 10))} · {formatDisplayTime(item.reviewedAt)}
                {item.reviewedByName ? ` · ${item.reviewedByName}` : ''}
              </Text>
            </View>
          ) : (
            <View style={[styles.row, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>Reviewed</Text>
              <Text style={[theme.typography.body, { color: theme.colors.textFaint }]}>Not reviewed yet</Text>
            </View>
          )}
        </Card>

        <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>REASON</Text>
        <Card style={{ marginTop: theme.spacing.sm }}>
          <Text style={[theme.typography.body, { color: theme.colors.text }]}>{item.reason}</Text>
        </Card>

        {item.reviewNote ? (
          <>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.lg }]}>PRODUCTION'S NOTE</Text>
            <Card style={{ marginTop: theme.spacing.sm }}>
              <Text style={[theme.typography.body, { color: theme.colors.warning }]}>{item.reviewNote}</Text>
            </Card>
          </>
        ) : null}

        {canEdit ? (
          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              onPress={() => requestSheetRef.current?.present()}
              style={[styles.actionButton, { backgroundColor: theme.colors.border }]}>
              <Icon name="pencil" size={14} color={theme.colors.text} />
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{discountChangeActionLabel(item.status)}</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setWithdrawOpen(true);
                withdrawSheetRef.current?.present();
              }}
              style={[styles.actionButton, { backgroundColor: `${theme.colors.danger}1A` }]}>
              <Icon name="trash" size={14} color={theme.colors.danger} />
              <Text style={[theme.typography.body, { color: theme.colors.danger, fontWeight: '700' }]}>Withdraw</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <FormBottomSheet ref={requestSheetRef} title={discountChangeActionLabel(item.status)} onRequestClose={() => requestSheetRef.current?.dismiss()}>
        <RequestDiscountSheetContent editItem={item} onDone={() => requestSheetRef.current?.dismiss()} />
      </FormBottomSheet>

      <WithdrawConfirmSheet
        ref={withdrawSheetRef}
        item={withdrawOpen ? item : null}
        isSubmitting={isWithdrawing}
        error={raceError}
        onConfirm={() => void handleWithdrawConfirm()}
        onRequestClose={() => {
          withdrawSheetRef.current?.dismiss();
          clearRaceError();
          setWithdrawOpen(false);
        }}
      />
    </Screen>
  );
}
