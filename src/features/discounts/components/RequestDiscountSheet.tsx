import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import {
  MBButton,
  MBCard,
  MBHeader,
  MBInput,
  MBMoney,
  MBPressable,
  MBSkeletonList,
  MBStatusTag,
} from '@/common/ui';
import { getProductionOrders } from '@/api/services/productionService';
import { qk } from '@/api/queryKeys';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import { useNetworkStore } from '@/state/networkStore';
import { formatBusinessDate } from '@/common/helpers/businessDay';
import { formatCurrency } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import type { BranchDiscount } from '@/shared/types/discount.types';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';

import {
  claimedAgainst,
  demandEstimate,
  openClaimOn,
  requestProblems,
  sanitiseMoney,
} from '../helpers/requestChecks';

/**
 * Raise a claim, quickly.
 *
 * The full record — search, filters, change, withdraw — is `DiscountsScreen`.
 * This is the quick raise with just enough history to confirm the last one
 * landed, and it is deliberately not allowed to grow into a second copy of that
 * screen: three rows, no search, no paging, and a line pointing at the list.
 *
 * ---------------------------------------------------------------------------
 * The demand's value is guidance, and cannot be a gate
 * ---------------------------------------------------------------------------
 * A demand carries no money in this system — quantities go up, Production works
 * out the money — so its worth has to be summed here from `unitPrice`, which is
 * **optional per line**. A demand with one unpriced line sums LOW. Blocking on
 * that figure would refuse a legitimate claim the server would have taken, on
 * the screen whose entire job is recovering money the branch is owed. So the
 * figure is shown, marked as an estimate when it is incomplete, and Send does
 * not consult it.
 *
 * What IS exact, and therefore worth stating firmly, is how much has already
 * been claimed against the same demand: those are real claims with real amounts.
 *
 * ---------------------------------------------------------------------------
 * The duplicate guard is the substance of the form
 * ---------------------------------------------------------------------------
 * Nothing server-side stops two claims on one demand, and a second raised before
 * the first is answered is how a branch ends up with both bounced. The guard
 * tests `isDiscountOpen` rather than "has it been reviewed": a returned claim
 * carries a review timestamp and is exactly the one to correct instead.
 */

/** Rows of history — a confirmation, not a record. */
const PREVIEW_COUNT = 3;

export function RequestDiscountSheet({
  claims,
  busy,
  error,
  onSend,
  onClose,
  onOpenList,
}: {
  /** Every claim in the window, for the guard and the already-claimed figure. */
  claims: readonly BranchDiscount[];
  busy: boolean;
  error: string | null;
  onSend: (input: {
    productionOrderId: string;
    amount: number;
    reason: string;
  }) => Promise<boolean>;
  onClose: () => void;
  onOpenList: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();
  const isOnline = useNetworkStore(s => s.isOnline);

  const [productionOrderId, setProductionOrderId] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');

  const orders = useQuery({
    queryKey: qk.productionOrders.list({}),
    queryFn: () => getProductionOrders({}),
  });

  const chosen = useMemo<BranchProductionOrder | null>(
    () => (orders.data ?? []).find(o => o.id === productionOrderId) ?? null,
    [orders.data, productionOrderId],
  );

  const estimate = useMemo(() => demandEstimate(chosen), [chosen]);
  const already = useMemo(
    () => (productionOrderId ? claimedAgainst(claims, productionOrderId) : 0),
    [claims, productionOrderId],
  );

  const problems = useMemo(
    () => requestProblems({ productionOrderId, amount, reason, claims }),
    [productionOrderId, amount, reason, claims],
  );

  const recent = useMemo(() => claims.slice(0, PREVIEW_COUNT), [claims]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Request discount"
        subtitle="Claim money back against a demand"
        {...(busy ? {} : { onBack: onClose })}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        {/* The demand picker. Each row says what the demand came to and marks
            the ones that already carry an open claim, so the choice is made with
            the information rather than corrected afterwards. */}
        <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>Demand</Text>

        {orders.isPending ? (
          <MBSkeletonList rows={3} />
        ) : (orders.data ?? []).length === 0 ? (
          <MBCard>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              No demands to claim against yet.
            </Text>
          </MBCard>
        ) : (
          (orders.data ?? []).slice(0, 12).map(order => {
            const blocked = openClaimOn(claims, order.id) !== null;
            const est = demandEstimate(order);
            const selected = order.id === productionOrderId;
            return (
              <MBPressable
                key={order.id}
                onPress={() => setProductionOrderId(order.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                testID={`demand-option-${order.id}`}>
                <MBCard>
                  <View style={styles.row}>
                    <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
                      {order.demandNumber}
                    </Text>
                    {selected ? <MBStatusTag label="Selected" /> : null}
                  </View>
                  <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                    {`${formatBusinessDate(order.date)} · ${
                      est.incomplete ? 'value partly unknown' : `about ${formatCurrency(est.value, currencySymbol)}`
                    }`}
                  </Text>
                  {blocked ? (
                    <Text style={[theme.type.caption, { color: theme.colors.warning }]}>
                      A claim on this demand is already waiting on Production.
                    </Text>
                  ) : null}
                </MBCard>
              </MBPressable>
            );
          })
        )}

        {problems.demand ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}
            testID="request-demand-problem">
            {problems.demand}
          </Text>
        ) : null}

        <MBInput
          label={`Amount (${currencySymbol ?? 'Rs.'})`}
          required
          value={amount}
          // Paise are legal — the server takes two decimals — but `7.5.0` is not,
          // and the keystroke is the cheapest place to stop it.
          onChangeText={text => setAmount(sanitiseMoney(text))}
          keyboardType="decimal-pad"
          placeholder="0.00"
          error={problems.amount ?? undefined}
          editable={!busy}
          testID="request-amount"
        />

        {/* Guidance, not a gate. Stated as soon as a demand is picked so the
            choice is informed, and honest about what it does not know. */}
        {chosen ? (
          <MBCard testID="request-demand-context">
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {estimate.incomplete
                ? `Some lines on ${chosen.demandNumber} have no recorded rate, so its value cannot be totalled here.`
                : `${chosen.demandNumber} came to about ${formatCurrency(estimate.value, currencySymbol)}.`}
            </Text>
            <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
              {already > 0
                ? `${formatCurrency(already, currencySymbol)} has already been claimed against it.`
                : 'Nothing has been claimed against it yet.'}
            </Text>
          </MBCard>
        ) : null}

        <MBInput
          label="Reason"
          required
          value={reason}
          onChangeText={setReason}
          multiline
          placeholder="What was wrong with the delivery?"
          error={problems.reason ?? undefined}
          editable={!busy}
          testID="request-reason"
        />

        {/* Advisory: a short reason is allowed, it just tends to come back. */}
        {problems.reasonHint ? (
          <Text
            style={[theme.type.caption, { color: theme.colors.textMuted }]}
            testID="request-reason-hint">
            {problems.reasonHint}
          </Text>
        ) : null}

        {error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}
            testID="request-error">
            {error}
          </Text>
        ) : null}

        {recent.length > 0 ? (
          <>
            <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
              Your recent requests
            </Text>
            {recent.map(claim => (
              <MBCard key={claim.id} testID={`recent-${claim.id}`}>
                <View style={styles.row}>
                  <Text style={[theme.type.body, { color: theme.colors.text }]}>
                    {claim.demandNumber}
                  </Text>
                  <MBMoney value={claim.amount} size="sm" symbol={currencySymbol} />
                </View>
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  {formatBusinessDate(claim.date)}
                </Text>
              </MBCard>
            ))}
            {/* The division stated, so nobody looks for search here. */}
            <MBPressable onPress={onOpenList} accessibilityRole="button" hitSlop={8}>
              <Text style={[theme.type.label, { color: theme.colors.accent }]}>
                See every claim in Discount Claims
              </Text>
            </MBPressable>
          </>
        ) : null}
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            backgroundColor: theme.colors.surface,
            borderTopColor: theme.colors.border,
            padding: theme.layout.screenPad,
          },
        ]}>
        {!isOnline ? (
          <Text style={[theme.type.caption, { color: theme.colors.offline }]}>
            You&apos;re offline. A claim is raised on the server, so this needs a connection.
          </Text>
        ) : null}
        <MBButton
          label="Send request"
          onPress={async () => {
            if (!productionOrderId) return;
            const ok = await onSend({
              productionOrderId,
              amount: Number(amount),
              reason: reason.trim(),
            });
            if (ok) onClose();
          }}
          loading={busy}
          disabled={!problems.canSend || !isOnline || busy}
          fullWidth
          testID="request-send"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
  },
  footer: { borderTopWidth: 1, gap: space.sm },
});
