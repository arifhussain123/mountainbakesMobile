import { useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useBranchDiscounts } from '@/api';
import type { DiscountsStackParamList } from '@/navigation';
import { designType, FLAT_CARD, heroType, useAppTheme } from '@/shared/theme';
import { BackBar, Card, ErrorState, Eyebrow, FormBottomSheet, HeroSurface, Icon, InfoBanner, LoadingSkeleton, MiniStat, Screen, SmallButton, StatusBadge, useHeroInk } from '@/shared/ui';
import { formatCurrency, formatDisplayDate, formatDisplayTime } from '@/shared/utils';
import { mapErrorToMessage } from '@/shared/helpers';
import { DISCOUNT_STATUS_LABEL, DISCOUNT_STATUS_VARIANT, discountChangeActionLabel, isDiscountOpen } from '../../utils';
import { useDiscountActions, useHasPendingDiscountAction } from '../../hooks';
import { AmountChangedNote, DiscountDayBreakdown, WithdrawConfirmSheet } from '../../components';
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
  const { ink: heroInk, muted: heroMuted } = useHeroInk();

  if (isLoading) {
    return (
      <Screen>
        <BackBar onBack={() => navigation.goBack()} title="Discount Claim" />
        <View style={{ padding: 20 }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen>
        <BackBar onBack={() => navigation.goBack()} title="Discount Claim" />
        <ErrorState message={mapErrorToMessage(error)} onRetry={() => void refetch()} />
      </Screen>
    );
  }

  if (!item) {
    return (
      <Screen>
        <BackBar onBack={() => navigation.goBack()} title="Discount Claim" />
        <Text style={[designType.p, { color: theme.colors.textSecondary, padding: 20 }]}>
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
      <BackBar onBack={() => navigation.goBack()} title={item.demandNumber} subtitle={item.branchName} />
      <ScrollView contentContainerStyle={styles.body}>
        <HeroSurface style={styles.hero}>
          <Text style={[heroType.eyebrow, { color: heroMuted }]}>Claimed amount</Text>
          <Text style={[heroType.amount, { color: heroInk }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {formatCurrency(item.amount)}
          </Text>
          <View style={styles.miniRow}>
            <MiniStat onHero label="Claimed" value={formatDisplayDate(item.date)} />
            <MiniStat onHero label="Time" value={formatDisplayTime(item.createdAt)} />
            <MiniStat onHero label="Claim ID" value={item.id.slice(0, 8)} />
          </View>
        </HeroSurface>

        <View style={styles.statusRow}>
          <StatusBadge label={DISCOUNT_STATUS_LABEL[item.status] ?? item.status} variant={DISCOUNT_STATUS_VARIANT[item.status] ?? 'neutral'} />
          {!isDiscountOpen(item.status) ? (
            <View style={styles.final}>
              <Icon name="lock" size={12} color={theme.colors.textFaint} />
              <Text style={[designType.xs, { color: theme.colors.textFaint }]}>Final</Text>
            </View>
          ) : null}
        </View>

        {item.originalAmount != null ? (
          <Card style={[FLAT_CARD, styles.amountCard]}>
            <View style={styles.row}>
              <Text style={[designType.sm, { color: theme.colors.textSecondary }]}>Amount</Text>
              <Text style={[designType.amt, { color: theme.colors.text }]}>{formatCurrency(item.amount)}</Text>
            </View>
            <AmountChangedNote item={item} />
          </Card>
        ) : null}

        <Eyebrow>Reason</Eyebrow>
        <Card style={FLAT_CARD}>
          <Text style={[designType.p, { color: theme.colors.text }]}>“{item.reason}”</Text>
        </Card>

        {item.reviewNote ? (
          <>
            <Eyebrow>Production's note</Eyebrow>
            <InfoBanner kind="warn" icon="message-circle">
              {item.reviewNote}
            </InfoBanner>
          </>
        ) : null}

        {/* The day's till discounts per product against what was claimed — the
            same check Production makes before approving (owner's call, 2026-11-06). */}
        <DiscountDayBreakdown side="branch" branchId={item.branchId} date={item.date} />

        {canEdit ? (
          <View style={styles.actionsRow}>
            <SmallButton
              size="sm"
              kind="secondary"
              icon="pencil"
              label={discountChangeActionLabel(item.status)}
              onPress={() => requestSheetRef.current?.present()}
              style={styles.action}
            />
            <SmallButton
              size="sm"
              kind="danger"
              icon="trash"
              label="Withdraw"
              onPress={() => {
                setWithdrawOpen(true);
                withdrawSheetRef.current?.present();
              }}
              style={styles.action}
            />
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


