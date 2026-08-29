import React, { useCallback, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import { MBButton, MBCard, MBDataRow, MBHeader, MBMoney } from '@/common/ui';
import { paymentMethodLabel } from '@/common/constants/paymentMethods';
import { lineAmount } from '@/common/helpers/saleTotals';
import { formatCurrency, formatQty } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';
import { useTheme } from '@/common/theme/ThemeProvider';
import { karachiTimeStr } from '@/shared/utils/timezone';

import type { SaleSlip } from './types';

export interface SaleReceiptProps {
  sale: SaleSlip;
  branchName?: string | null;
  onDone: () => void;
}

/**
 * The till slip for a sale that has just been rung up.
 *
 * ---------------------------------------------------------------------------
 * "Share", not "Print", and that is a capability statement rather than a choice
 * ---------------------------------------------------------------------------
 * Nothing in this app prints. `react-native-print` is unusable here — its
 * `react-native-windows` peer is mandatory and pins RN 0.84.1 — and rendering a
 * real PDF belongs on the server, which already depends on `pdfkit` and has no
 * endpoint for it. `OrderPrintPreview` reached the same wall for the production
 * slip and settled on `Share.share` with plain text; this is the same answer for
 * the same reason, so there is one story about printing in this app rather than
 * two.
 *
 * ---------------------------------------------------------------------------
 * Two things this slip will not pretend
 * ---------------------------------------------------------------------------
 * **It shows a sale number only where one exists.** The production counter posts
 * live and is answered with an `orderNumber`, so its slip carries a reference a
 * person can quote. The branch till is offline-first: its write path returns
 * this device's `client_operation_id` and an outcome, never the server's order
 * id, and a queued sale genuinely does not have one at all. A reference invented
 * there is one a customer would quote back at a counter that has never heard of
 * it.
 *
 * **It hedges its figures only where they are the till's.** The production
 * counter posts live and is answered with the server's own subtotal, discount,
 * tax and total, so its slip prints numbers nobody can disagree with. The branch
 * till's write path returns an outcome and nothing else, so even a synced branch
 * sale carries this device's arithmetic over cached `AppSettings` — which a
 * stale `gstRate` can put at odds with the sale actually recorded. `authoritative`
 * is the difference, and it drives both the `estimate` mark and the closing
 * sentence.
 *
 * A **refused** sale never reaches this screen, and `SaleSlip` has no state for
 * one: the server rejected it, so there is nothing to give anybody a slip for.
 * Both tills leave to their list in that case instead.
 */
export function SaleReceipt({
  sale,
  branchName,
  onDone,
}: SaleReceiptProps): React.ReactElement {
  const theme = useTheme();
  const [shared, setShared] = useState(false);
  const queued = !sale.confirmed;
  const symbol = sale.currencySymbol;

  const onShare = useCallback(async () => {
    try {
      await Share.share({ message: asPlainText(sale, branchName) });
      setShared(true);
    } catch {
      // The user dismissed the share sheet, or the platform refused it. Neither
      // is a failure of the sale, which is already recorded — so the slip stays
      // open and says nothing rather than raising an error about the wrong thing.
    }
  }, [branchName, sale]);

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Sale slip"
        subtitle={queued ? 'Saved on this device' : 'Recorded'}
        onBack={onDone}
      />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}>
        <MBCard>
          {sale.orderNumber ? (
            <MBDataRow label="Sale no." value={sale.orderNumber} />
          ) : null}
          <MBDataRow label="Branch" value={branchName ?? 'Your branch'} />
          <MBDataRow label="Business day" value={sale.businessDate} />
          <MBDataRow label="Time" value={karachiTimeStr()} />
          <MBDataRow label="Payment" value={paymentMethodLabel(sale.paymentMethod)} />
          {sale.customerName ? (
            <MBDataRow label="Customer" value={sale.customerName} />
          ) : null}
          {sale.customerPhone ? (
            <MBDataRow label="Mobile" value={sale.customerPhone} />
          ) : null}
        </MBCard>

        <MBCard>
          {sale.lines.map(line => (
            <View key={line.productId} style={styles.line}>
              <View style={styles.lineMain}>
                <Text
                  numberOfLines={2}
                  style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
                  {line.productName}
                </Text>
                <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
                  {formatQty(line.qty)} × {formatCurrency(line.unitPrice, symbol)}
                  {line.discount > 0
                    ? ` · less ${formatCurrency(line.discount, symbol)}`
                    : ''}
                </Text>
              </View>
              <MBMoney value={lineAmount(line)} size="sm" symbol={symbol} />
            </View>
          ))}
        </MBCard>

        <MBCard>
          <MBDataRow
            label="Subtotal"
            value={<MBMoney value={sale.totals.grossSubtotal} size="sm" symbol={symbol} />}
          />
          {sale.totals.discountTotal > 0 ? (
            <MBDataRow
              label="Discount"
              value={<MBMoney value={-sale.totals.discountTotal} size="sm" symbol={symbol} />}
            />
          ) : null}
          {sale.totals.taxAmount > 0 ? (
            <MBDataRow
              label="Government Tax"
              value={<MBMoney value={sale.totals.taxAmount} size="sm" symbol={symbol} />}
            />
          ) : null}
          <MBDataRow
            label="Grand total"
            value={
              <MBMoney
                value={sale.totals.grandTotal}
                estimate={!sale.authoritative}
                symbol={symbol}
                testID="slip-total"
              />
            }
          />
          {sale.receivedCash !== null ? (
            <>
              <MBDataRow
                label="Cash received"
                value={<MBMoney value={sale.receivedCash} size="sm" symbol={symbol} />}
              />
              <MBDataRow
                label="Cash returned"
                value={<MBMoney value={sale.returned ?? 0} size="sm" symbol={symbol} />}
              />
            </>
          ) : null}
        </MBCard>

        {/*
          The two sentences this slip owes anyone reading it. `queued` first,
          because it changes what the paper means: the sale exists on this phone
          and nowhere else yet, so there is no number to quote and nobody at head
          office can see it.
        */}
        <View style={styles.notes}>
          {queued ? (
            <Text
              accessibilityRole="alert"
              style={[theme.type.caption, { color: theme.colors.offline }]}>
              Saved on this device and waiting to sync. It has no sale number
              until it reaches the server.
            </Text>
          ) : null}
          {/* Only where it is true. The production counter's slip prints the
              server's own subtotal, discount, tax and total, so hedging them
              would be a disclaimer about numbers nobody can disagree with. */}
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
            {sale.authoritative
              ? 'Amounts as recorded by the server.'
              : "Amounts are this till's own. The server confirms the final figures."}
          </Text>
        </View>
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
        <MBButton
          label={shared ? 'Share again' : 'Share slip'}
          variant="secondary"
          onPress={onShare}
          style={styles.grow}
          testID="share-slip"
        />
        <MBButton label="Done" onPress={onDone} style={styles.grow} testID="slip-done" />
      </View>
    </View>
  );
}

/**
 * The slip as plain text, which is what actually leaves the device.
 *
 * Built here rather than from the rendered tree because the two have different
 * jobs: the screen is read at the counter and the text is read in WhatsApp, on a
 * phone that has none of this app's typography. It is deliberately narrow and
 * unaligned — a receipt padded to a monospace column wraps into nonsense in a
 * chat bubble.
 */
function asPlainText(sale: SaleSlip, branchName?: string | null): string {
  const symbol = sale.currencySymbol;
  const lines = sale.lines.map(
    line =>
      `${line.productName} — ${formatQty(line.qty)} × ${formatCurrency(line.unitPrice, symbol)}` +
      (line.discount > 0 ? ` (less ${formatCurrency(line.discount, symbol)})` : '') +
      ` = ${formatCurrency(lineAmount(line), symbol)}`,
  );

  const money = [
    `Subtotal: ${formatCurrency(sale.totals.grossSubtotal, symbol)}`,
    sale.totals.discountTotal > 0
      ? `Discount: -${formatCurrency(sale.totals.discountTotal, symbol)}`
      : null,
    sale.totals.taxAmount > 0
      ? `Government Tax: ${formatCurrency(sale.totals.taxAmount, symbol)}`
      : null,
    `Grand total: ${formatCurrency(sale.totals.grandTotal, symbol)}`,
    sale.receivedCash !== null
      ? `Cash received: ${formatCurrency(sale.receivedCash, symbol)}`
      : null,
    sale.receivedCash !== null
      ? `Cash returned: ${formatCurrency(sale.returned ?? 0, symbol)}`
      : null,
  ].filter(Boolean);

  return [
    branchName ? `Mountain Bakes — ${branchName}` : 'Mountain Bakes',
    sale.orderNumber ? `Sale ${sale.orderNumber}` : null,
    `${sale.businessDate} ${karachiTimeStr()}`,
    `Payment: ${paymentMethodLabel(sale.paymentMethod)}`,
    sale.customerName ? `Customer: ${sale.customerName}` : null,
    '',
    ...lines,
    '',
    ...money,
    '',
    sale.confirmed
      ? null
      : 'Saved on the till and waiting to sync — no sale number yet.',
    sale.authoritative
      ? 'Amounts as recorded by the server.'
      : "Amounts are the till's own; the server confirms the final figures.",
  ]
    .filter(part => part !== null)
    .join('\n');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  line: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.tight },
  lineMain: { flex: 1, gap: space.hair },
  notes: { gap: space.sm },
  footer: { borderTopWidth: 1, flexDirection: 'row', gap: space.sm },
  grow: { flex: 1 },
});
