import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MBCard, MBDataRow, MBInput, MBMoney, MBSelect } from '@/common/ui';
import { paymentMethodLabel } from '@/common/constants/paymentMethods';
import { lineAmount, type CartLine, type SaleTotals } from '@/common/helpers/saleTotals';
import { formatCurrency, formatQty } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';

import { CashPad, type CashPadProps } from './CashPad';

export interface SalePaymentProps<M extends string> {
  lines: readonly CartLine[];
  totals: SaleTotals;
  currencySymbol?: string;

  /**
   * Which methods this counter offers. The branch has four; the production
   * counter has those plus `staff`, and the two lists are the schema's own —
   * `PAYMENT_METHOD_VALUES` not containing `staff` is what makes
   * `/api/orders/pos` reject an unpaid hand-out with no extra check anywhere.
   */
  methods: readonly M[];
  paymentMethod: M;
  onPaymentMethod: (method: M) => void;
  /** One line under the method row — the production counter's staff-sale note. */
  methodNote?: string;

  /** Omit entirely for a method that takes no cash. */
  cash?: CashPadProps;

  customerName: string;
  onCustomerName: (value: string) => void;
  customerPhone: string;
  onCustomerPhone: (value: string) => void;
  notes: string;
  onNotes: (value: string) => void;
  /** "Notes", or "Comment (required)" where the schema insists on one. */
  notesLabel?: string;
  notesError?: string;

  disabled?: boolean;
  testIDPrefix?: string;
}

/**
 * The payment stage of a till: what is being charged, how, the money taken, and
 * who for.
 *
 * ---------------------------------------------------------------------------
 * One component, two counters
 * ---------------------------------------------------------------------------
 * The branch till and the production counter differ in three things — the method
 * list, whether a comment is required, and whether cash is taken at all — and
 * agreed on everything else, including the sentence "Final amounts are confirmed
 * by the server." Two copies of that recap is how that sentence drifts, and how
 * one of them keeps `estimate` on the grand total while the other quietly drops
 * it. So the differences are props and the rest is here.
 *
 * ---------------------------------------------------------------------------
 * The recap is read-only, on purpose
 * ---------------------------------------------------------------------------
 * Quantities and discounts are set on the items stage and corrected there. This
 * is the readback — the last look before the sale is committed — and letting a
 * number be changed in two places is two places to look when a total is wrong.
 * Going back is the header's arrow; the cart survives it untouched, so a
 * correction costs one tap out and one tap back.
 *
 * ---------------------------------------------------------------------------
 * Payment method is `MBSelect`, not a bespoke grid
 * ---------------------------------------------------------------------------
 * v6 draws a 2×2 grid of tiles. `MBSelect` is a wrapping row of chips over a
 * short fixed enum, which lands two-up on a phone and is the same control — and
 * its own file names the payment method on the sale form as one of the two
 * duplicates it was extracted to stop.
 */
export function SalePayment<M extends string>({
  lines,
  totals,
  currencySymbol,
  methods,
  paymentMethod,
  onPaymentMethod,
  methodNote,
  cash,
  customerName,
  onCustomerName,
  customerPhone,
  onCustomerPhone,
  notes,
  onNotes,
  notesLabel = 'Notes',
  notesError,
  disabled = false,
  testIDPrefix = 'payment',
}: SalePaymentProps<M>): React.ReactElement {
  const theme = useTheme();

  return (
    <ScrollView
      contentContainerStyle={[
        contentColumn,
        { padding: theme.layout.screenPad, gap: theme.space.md },
      ]}
      keyboardShouldPersistTaps="handled">
      <MBCard>
        {lines.map(line => (
          <View key={line.productId} style={styles.line}>
            <View style={styles.lineMain}>
              <Text
                numberOfLines={2}
                style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
                {line.productName}
              </Text>
              <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                {formatQty(line.qty)} × {formatCurrency(line.unitPrice, currencySymbol)}
                {line.discountPct ? ` · less ${line.discountPct}%` : ''}
              </Text>
            </View>
            <MBMoney value={lineAmount(line)} size="sm" symbol={currencySymbol} />
          </View>
        ))}
      </MBCard>

      <MBCard>
        <MBDataRow
          label="Subtotal"
          value={<MBMoney value={totals.grossSubtotal} size="sm" symbol={currencySymbol} />}
        />
        {totals.discountTotal > 0 ? (
          <MBDataRow
            label="Discount"
            value={<MBMoney value={-totals.discountTotal} size="sm" symbol={currencySymbol} />}
          />
        ) : null}
        {totals.taxAmount > 0 ? (
          <MBDataRow
            label="Government Tax"
            value={<MBMoney value={totals.taxAmount} size="sm" symbol={currencySymbol} />}
          />
        ) : null}
        <MBDataRow
          label="Grand Total"
          value={<MBMoney value={totals.grandTotal} estimate symbol={currencySymbol} />}
        />
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Final amounts are confirmed by the server.
        </Text>
      </MBCard>

      <MBSelect
        label="Payment method"
        options={methods}
        value={paymentMethod}
        onChange={onPaymentMethod}
        renderLabel={paymentMethodLabel}
        testIDPrefix={testIDPrefix}
      />

      {methodNote ? (
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{methodNote}</Text>
      ) : null}

      {cash ? <CashPad {...cash} /> : null}

      {/* Optional throughout. A retail counter sale usually has no customer to
          name, and a required field here would be typed as "walk-in" a hundred
          times a day. */}
      <MBInput
        label="Customer name"
        value={customerName}
        onChangeText={onCustomerName}
        editable={!disabled}
        testID="customer-name"
      />
      <MBInput
        label="Mobile number"
        value={customerPhone}
        onChangeText={onCustomerPhone}
        keyboardType="phone-pad"
        editable={!disabled}
        testID="customer-phone"
      />
      <MBInput
        label={notesLabel}
        value={notes}
        onChangeText={onNotes}
        editable={!disabled}
        {...(notesError ? { error: notesError } : {})}
        testID="sale-notes"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.tight },
  lineMain: { flex: 1, gap: space.hair },
});
