import React, { useMemo, useState } from 'react';
import { Image, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { MBButton, MBCard, MBHeader, MBMoney } from '@/common/ui';
import { useCatalogSettings } from '@/common/hooks/useCatalogSettings';
import {
  getPreviousBalance,
  markPrinted,
  type PreviousBalance,
} from '@/api/services/productionService';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';
import { karachiDateStr, karachiTimeStr } from '@/shared/utils/timezone';
import { useTheme, useThemeContext } from '@/common/theme/ThemeProvider';
import { formatQty, toNumber } from '@/common/utils/money';
import { contentColumn, space } from '@/common/theme/spacing';
import { logoFor } from '@/assets/logo';
import { qk } from '@/api/queryKeys';

/**
 * Production slip preview — customer copy and company copy.
 *
 * The two differ deliberately: only the company copy carries the reconciliation
 * figures (previous balance, amount to collect) and the sign-off lines. Showing
 * the branch's outstanding balance on the customer's copy would put internal
 * accounting in a delivery driver's hands.
 *
 * Physical printing is NOT wired up. `react-native-print` is unusable here — its
 * `react-native-windows` peer is mandatory and pins RN 0.84.1 — so this screen
 * previews on-device and shares as text. Rendering a real PDF belongs on the
 * server, which already depends on `pdfkit`; that endpoint does not exist yet.
 */
export function OrderPrintPreview({
  order,
  onClose,
}: {
  order: BranchProductionOrder;
  onClose: () => void;
}): React.ReactElement {
  const theme = useTheme();
  const { currencySymbol } = useCatalogSettings();
  const [shared, setShared] = useState(false);

  // Billed against the immediately preceding delivered order — not "yesterday",
  // and not a running total. It does not track whether that order was settled,
  // so a reprint shows the same figure every time.
  const previousBalance = useQuery({
    queryKey: qk.production.previousBalance(order.id),
    queryFn: () => getPreviousBalance(order.id),
    // A missing previous balance is normal for a branch's first order.
    retry: false,
  });

  const printedAt = `${karachiDateStr()} ${karachiTimeStr()}`;
  const reference = slipReference(order);

  const items = useMemo(
    () =>
      (order.items ?? []).map(item => ({
        name: item.productName,
        qty: toNumber(item.approvedQty ?? item.qty),
        requested: toNumber(item.qty),
      })),
    [order.items],
  );

  const totalQty = items.reduce((sum, item) => sum + item.qty, 0);

  const onShare = async () => {
    try {
      await Share.share({
        message: asPlainText({
          order,
          items,
          printedAt,
          reference,
          balance: previousBalance.isSuccess ? previousBalance.data : undefined,
        }),
      });
      setShared(true);
      // Best-effort: the slip has left the device either way.
      markPrinted(order.id).catch(() => {});
    } catch {
      // The user dismissed the share sheet. Nothing to report.
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Print preview" subtitle={order.demandNumber} onBack={onClose} />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.md },
        ]}>
        {/*
          Two identical copies, one per party.
          The balance and the signature block used to be on the company copy
          only, as internal reconciliation. They are on both now: this slip is
          signed by the person handing over and the person receiving, and a
          receipt where only one side's copy carries the amount is not evidence
          of anything — the branch cannot check what it is being billed, and the
          two halves of a signed document disagree.
        */}
        {(['CUSTOMER COPY', 'COMPANY COPY'] as const).map(title => (
          <Copy
            key={title}
            title={title}
            order={order}
            items={items}
            totalQty={totalQty}
            printedAt={printedAt}
            reference={reference}
            balance={previousBalance.isSuccess ? previousBalance.data : undefined}
            currencySymbol={currencySymbol}
            showSignatures
          />
        ))}

        <MBButton
          label={shared ? 'Shared' : 'Share slip'}
          onPress={onShare}
          fullWidth
          testID="share-slip"
        />
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Shares as text. A printable PDF needs a server endpoint — see docs.
        </Text>
      </ScrollView>
    </View>
  );
}

function Copy({
  title,
  order,
  items,
  totalQty,
  printedAt,
  reference,
  balance,
  currencySymbol,
  showSignatures = false,
}: {
  title: string;
  order: BranchProductionOrder;
  items: Array<{ name: string; qty: number; requested: number }>;
  totalQty: number;
  printedAt: string;
  reference: string;
  balance?: PreviousBalance;
  currencySymbol?: string;
  showSignatures?: boolean;
}): React.ReactElement {
  const theme = useTheme();
  const { scheme } = useThemeContext();

  return (
    <MBCard>
      <View style={styles.docketHeader}>
        {/*
          The real mark, not a typeset name. This slip is shared and printed, and
          on paper a wordmark in the app's font is whatever font the printer
          substitutes. `logoFor` picks the variant for the background it sits on.
          The name below stays: at slip size the badge is legible as a mark but
          not as words.
        */}
        <Image
          source={logoFor(scheme)}
          style={styles.docketLogo}
          resizeMode="contain"
          // Bundled raster, nothing to wait for — see MBLogo.
          fadeDuration={0}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        />
        <Text style={[theme.type.h3, { color: theme.colors.accent }]}>Mountain Bakes</Text>
        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          Production Department
        </Text>
        <Text style={[theme.type.label, { color: theme.colors.text }]}>{title}</Text>
      </View>

      <Divider />

      <MetaRow label="Printed" value={printedAt} />
      <MetaRow label="Order" value={order.demandNumber} />
      <MetaRow label="Reference" value={reference} />
      <MetaRow label="Business date" value={order.date} />
      <MetaRow label="Branch" value={order.branchName} />
      <MetaRow label="Status" value={order.status} />
      {order.requiredDate ? <MetaRow label="Required by" value={order.requiredDate} /> : null}

      <Divider />

      <View style={styles.itemHeader}>
        <Text style={[theme.type.label, styles.itemName, { color: theme.colors.textMuted }]}>
          Item
        </Text>
        <Text style={[theme.type.label, styles.itemQty, { color: theme.colors.textMuted }]}>
          Qty
        </Text>
      </View>

      {items.map(item => (
        <View key={item.name} style={styles.itemRow}>
          <Text style={[theme.type.body, styles.itemName, { color: theme.colors.text }]}>
            {item.name}
            {/* Surfaced because a branch expecting 20 and receiving 15 needs to
                see it on the slip, not discover it at the counter. */}
            {item.qty !== item.requested ? (
              <Text style={{ color: theme.colors.warning }}>
                {' '}
                (asked {formatQty(item.requested)})
              </Text>
            ) : null}
          </Text>
          <Text style={[theme.type.mono, styles.itemQty, { color: theme.colors.text }]}>
            {formatQty(item.qty)}
          </Text>
        </View>
      ))}

      <Divider />

      <View style={styles.itemRow}>
        <Text style={[theme.type.bodyStrong, styles.itemName, { color: theme.colors.text }]}>
          Total units
        </Text>
        <Text style={[theme.type.money, styles.itemQty, { color: theme.colors.text }]}>
          {formatQty(totalQty)}
        </Text>
      </View>

      {balance ? (
        <>
          <Divider />
          {/*
            Payment information — the working, not just the answer.
            The slip used to print "collect X" alone, which nobody receiving it
            could check. Delivered value less returns, at the company's share,
            is how X is reached, so the branch can verify the figure it is
            signing for. Each line is optional on the response and is rendered
            only when the server actually sent it: a blank "Returns —" invites
            the reader to treat a missing number as a zero.

            There is no per-item price on this document. A production demand is
            an internal transfer — `BranchProductionOrderItem` carries qty and
            approvedQty and no money at all — so the only figures that exist are
            these settlement ones. Do not add a Price column by multiplying
            something out; it would be invented money on a document people sign.
          */}
          <Text style={[theme.type.label, styles.sectionLabel, { color: theme.colors.textMuted }]}>
            Payment information
          </Text>
          {balance.deliveredValue !== undefined ? (
            <MetaRow
              label="Previous delivery"
              value={<MBMoney value={balance.deliveredValue} size="sm" symbol={currencySymbol} />}
            />
          ) : null}
          {balance.returnsValue !== undefined ? (
            <MetaRow
              label="Less returns"
              value={<MBMoney value={balance.returnsValue} size="sm" symbol={currencySymbol} />}
            />
          ) : null}
          {balance.companySharePct !== undefined ? (
            <MetaRow label="Company share" value={`${balance.companySharePct}%`} />
          ) : null}
          <MetaRow
            label="Previous balance to collect"
            value={
              <MBMoney value={toNumber(balance.amountToCollect)} size="sm" symbol={currencySymbol} />
            }
          />
        </>
      ) : null}

      {showSignatures ? (
        <>
          <Divider />
          <View style={styles.signatures}>
            <SignatureLine label="Prepared by" />
            <SignatureLine label="Received by" />
          </View>
        </>
      ) : null}
    </MBCard>
  );
}

/**
 * A line on the printed slip. Deliberately not `MBDataRow`: this is receipt
 * chrome at caption size, sized to a thermal print-out rather than to a card in
 * the app, and the two should be free to move independently.
 *
 * `value` takes a node so an amount can arrive as `<MBMoney />`.
 */
function MetaRow({ label, value }: { label: string; value: React.ReactNode }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      {typeof value === 'string' ? (
        <Text style={[theme.type.mono, { color: theme.colors.text }]}>{value}</Text>
      ) : (
        value
      )}
    </View>
  );
}

function Divider(): React.ReactElement {
  const theme = useTheme();
  return <View style={[styles.divider, { borderBottomColor: theme.colors.borderStrong }]} />;
}

function SignatureLine({ label }: { label: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.signature}>
      <View style={[styles.signatureRule, { borderBottomColor: theme.colors.borderStrong }]} />
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

/** Human reference, matching the web client: PO-{date}-{time}. */
export function slipReference(order: { date?: string; time?: string }): string {
  const date = (order.date ?? '').replace(/-/g, '');
  const time = (order.time ?? '').replace(/:/g, '');
  return `PO-${date}-${time}`;
}

function asPlainText({
  order,
  items,
  printedAt,
  reference,
  balance,
}: {
  order: BranchProductionOrder;
  items: Array<{ name: string; qty: number }>;
  printedAt: string;
  reference: string;
  balance?: PreviousBalance;
}): string {
  const lines = [
    'MOUNTAIN BAKES — Production',
    `Order:     ${order.demandNumber}`,
    `Reference: ${reference}`,
    `Branch:    ${order.branchName}`,
    `Date:      ${order.date}`,
    `Status:    ${order.status}`,
    `Printed:   ${printedAt}`,
    '',
    ...items.map(item => `${item.qty} × ${item.name}`),
  ];

  // The shared text IS the slip for anyone who receives it by message rather
  // than on paper. Leaving the money off would make the two versions of the
  // same document disagree about what is owed.
  if (balance) {
    lines.push('', 'PAYMENT');
    if (balance.deliveredValue !== undefined) {
      lines.push(`Previous delivery: ${balance.deliveredValue}`);
    }
    if (balance.returnsValue !== undefined) {
      lines.push(`Less returns:      ${balance.returnsValue}`);
    }
    if (balance.companySharePct !== undefined) {
      lines.push(`Company share:     ${balance.companySharePct}%`);
    }
    lines.push(`To collect:        ${balance.amountToCollect}`);
  }

  return lines.join('\n');
}

const styles = StyleSheet.create({
  docketLogo: { width: 48, height: 48 },
  sectionLabel: { marginTop: space.tight },
  flex: { flex: 1 },
  docketHeader: { alignItems: 'center', gap: space.hair },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: space.snug },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.hair,
  },
  itemHeader: { flexDirection: 'row', gap: space.md, paddingBottom: space.xs },
  itemRow: { flexDirection: 'row', gap: space.md, paddingVertical: space.hair },
  itemName: { flex: 1 },
  itemQty: { minWidth: 64, textAlign: 'right' },
  signatures: { flexDirection: 'row', gap: space.lg, marginTop: space.xl },
  signature: { flex: 1, gap: space.xs },
  signatureRule: { borderBottomWidth: 1, height: 28 },
});
