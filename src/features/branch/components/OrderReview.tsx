import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  MBButton,
  MBCard,
  MBDataRow,
  MBHeader,
  MBInput,
  MBMoney,
  MBQtyStepper,
} from '@/common/ui';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { formatQty } from '@/common/utils/money';

import type {
  OrderBusy,
  OrderLine,
  OrderLineIdentity,
  OrderTotals,
} from '../hooks/useProductionOrderForm';
export interface OrderReviewProps {
  lines: readonly OrderLine[];
  requiredDate: string;
  branchName?: string | null;
  totals: OrderTotals;
  busy: OrderBusy;
  error: string | null;
  currencySymbol?: string;
  onQty: (line: OrderLineIdentity, qty: number) => void;
  onRemark: (productId: string, text: string) => void;
  onBack: () => void;
  onConfirm: () => void;
}

/**
 * What stops this demand being sent, in words.
 *
 * Exported and pure because it is a rule rather than a rendering detail, and
 * because the alternative — a greyed button with nothing beside it — sends
 * someone back to the table to hunt for a problem the screen already knows.
 *
 * The empty-basket case is genuinely reachable from here and is not defensive
 * padding: quantities stay editable in this review, and stepping every one of
 * them to zero removes every line (`setQtyFor` deletes at zero rather than
 * storing it). That leaves a review of nothing, which is a state worth naming.
 *
 * The date cannot be cleared from this screen — `openReview` refuses to open
 * without one — but it is checked anyway, because this component takes it as a
 * prop and a caller that opened the review without one would otherwise get a
 * dead button and no reason.
 */
export function reviewBlockers(
  lines: readonly OrderLine[],
  requiredDate: string,
): readonly string[] {
  const out: string[] = [];
  if (lines.length === 0) {
    out.push('Every line was removed. Add at least one product to send this demand.');
  }
  if (requiredDate.trim() === '') {
    out.push('Set the date this delivery is needed.');
  }
  return out;
}

/**
 * The last thing between a branch and a commitment.
 *
 * ---------------------------------------------------------------------------
 * Why a demand is not sent straight from the table
 * ---------------------------------------------------------------------------
 * v6's screen 20 submits from the footer. That works on a mock with eight
 * products; the real catalogue is hundreds of rows filtered by a debounced
 * search, so a branch that searched "rusk", set three quantities, then searched
 * "cake" and set two more has never seen the demand it is about to commit. This
 * write is offline-first and goes to central production — it is exactly the kind
 * that must not be sent blind. So Submit validates and opens this; the request
 * happens on the confirm.
 *
 * Nothing is recomputed here. These are the lines that will be sent, which is
 * the only thing a review is worth showing.
 *
 * Quantities and remarks stay editable. A review that can only be accepted or
 * abandoned sends people back to hunt for a product in a filtered list to change
 * one number, and the fastest correction is the one you can make where you
 * noticed the mistake. Remarks live here rather than on the table row because
 * `ProductionOrderItemSchema.remarks` is **per item** — one shared box used to
 * stamp its text onto every line, so a note meant for one product ("thin icing")
 * was submitted as an instruction about all eight.
 */
export function OrderReview({
  lines,
  requiredDate,
  branchName,
  totals,
  busy,
  error,
  currencySymbol,
  onQty,
  onRemark,
  onBack,
  onConfirm,
}: OrderReviewProps): React.ReactElement {
  const theme = useTheme();
  const saving = busy === 'submit';
  const blockers = reviewBlockers(lines, requiredDate);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      {/*
        The way back is withheld while the request is in flight, and that is the
        point rather than a detail: this screen is a modal, so Android's hardware
        Back reaches it too, and dismissing mid-send does NOT cancel anything —
        the demand still lands and its outcome still reports on the form behind.
        A back arrow that reads as "cancel" while the order goes anyway is how
        someone believes they stopped an order they in fact sent. It returns the
        moment the attempt fails, which is when going back means something again.
      */}
      <MBHeader
        title="Review order"
        subtitle="Check before submitting"
        {...(saving ? {} : { onBack })}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}
        keyboardShouldPersistTaps="handled">
        <MBCard>
          <MBDataRow label="For" value={branchName ?? 'Your branch'} />
          <MBDataRow label="Required by" value={requiredDate} />
          <MBDataRow label="Products" value={String(totals.selected)} />
          <MBDataRow label="Total units" value={formatQty(totals.quantity)} />
          <MBDataRow
            label="Estimated value"
            value={
              <MBMoney
                value={totals.amount}
                size="sm"
                estimate
                {...(currencySymbol ? { symbol: currencySymbol } : {})}
              />
            }
          />
        </MBCard>

        {lines.map(line => (
          <MBCard key={line.productId}>
            <View style={styles.line}>
              <Text
                numberOfLines={2}
                style={[theme.type.bodyStrong, styles.flex, { color: theme.colors.text }]}>
                {line.name}
              </Text>
              <MBMoney
                value={line.rate * line.qty}
                size="sm"
                {...(currencySymbol ? { symbol: currencySymbol } : {})}
              />
            </View>

            <View style={styles.controls}>
              <MBQtyStepper
                value={line.qty}
                onChange={qty =>
                  onQty(
                    { productId: line.productId, name: line.name, rate: line.rate },
                    qty,
                  )
                }
                label={line.name}
                disabled={saving}
              />
            </View>

            {/* Optional: most lines need none, and an empty string is what the
                server defaults to anyway. */}
            <MBInput
              label="Note for Production"
              value={line.remark}
              onChangeText={text => onRemark(line.productId, text)}
              editable={!saving}
              testID={`remark-${line.productId}`}
            />
          </MBCard>
        ))}
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
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}>
            {error}
          </Text>
        ) : null}

        {/* Why the button is dead, next to the button. */}
        {blockers.map(reason => (
          <Text
            key={reason}
            accessibilityRole="alert"
            style={[theme.type.caption, { color: theme.colors.danger }]}
            testID="review-blocker">
            {reason}
          </Text>
        ))}

        <MBButton
          label="Confirm and send"
          onPress={onConfirm}
          loading={saving}
          disabled={blockers.length > 0}
          fullWidth
          testID="confirm-order"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  controls: { flexDirection: 'row', alignItems: 'center', marginTop: space.sm },
  footer: { borderTopWidth: 1, gap: space.sm },
});
