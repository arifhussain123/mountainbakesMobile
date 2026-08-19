import React, { useMemo, useState } from 'react';
import { ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { MBButton, MBCard, MBHeader } from '@/components';
import { useCatalogSettings } from '@/hooks/useCatalogSettings';
import { getPreviousBalance, markPrinted } from '@/services/api/productionApi';
import type { BranchProductionOrder } from '@/shared/types/production-order.types';
import { karachiDateStr, karachiTimeStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, formatQty, toNumber } from '@/utils/money';

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
    queryKey: ['production', 'previous-balance', order.id],
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
  const amountToCollect = toNumber(previousBalance.data?.amountToCollect);

  const onShare = async () => {
    try {
      await Share.share({ message: asPlainText({ order, items, printedAt, reference }) });
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

      <ScrollView contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.md }}>
        <Copy
          title="CUSTOMER COPY"
          order={order}
          items={items}
          totalQty={totalQty}
          printedAt={printedAt}
          reference={reference}
        />

        <Copy
          title="COMPANY COPY"
          order={order}
          items={items}
          totalQty={totalQty}
          printedAt={printedAt}
          reference={reference}
          // Internal reconciliation — company copy only.
          amountToCollect={previousBalance.isSuccess ? amountToCollect : undefined}
          currencySymbol={currencySymbol}
          showSignatures
        />

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
  amountToCollect,
  currencySymbol,
  showSignatures = false,
}: {
  title: string;
  order: BranchProductionOrder;
  items: Array<{ name: string; qty: number; requested: number }>;
  totalQty: number;
  printedAt: string;
  reference: string;
  amountToCollect?: number;
  currencySymbol?: string;
  showSignatures?: boolean;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <MBCard>
      <View style={styles.docketHeader}>
        <Text style={[theme.type.h3, { color: theme.colors.primary }]}>Mountain Bakes</Text>
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
              <Text style={{ color: theme.colors.warning }}> (asked {formatQty(item.requested)})</Text>
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

      {amountToCollect !== undefined ? (
        <>
          <Divider />
          <MetaRow
            label="Previous balance to collect"
            value={formatCurrency(amountToCollect, currencySymbol)}
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

function MetaRow({ label, value }: { label: string; value: string }): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.metaRow}>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>{label}</Text>
      <Text style={[theme.type.mono, { color: theme.colors.text }]}>{value}</Text>
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
}: {
  order: BranchProductionOrder;
  items: Array<{ name: string; qty: number }>;
  printedAt: string;
  reference: string;
}): string {
  const lines = [
    'MOUNTAIN BAKES — Production',
    `Order:     ${order.demandNumber}`,
    `Reference: ${reference}`,
    `Branch:    ${order.branchName}`,
    `Date:      ${order.date}`,
    `Printed:   ${printedAt}`,
    '',
    ...items.map(item => `${item.qty} × ${item.name}`),
  ];
  return lines.join('\n');
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  docketHeader: { alignItems: 'center', gap: 2 },
  divider: { borderBottomWidth: 1, borderStyle: 'dashed', marginVertical: 10 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 2 },
  itemHeader: { flexDirection: 'row', gap: 12, paddingBottom: 4 },
  itemRow: { flexDirection: 'row', gap: 12, paddingVertical: 3 },
  itemName: { flex: 1 },
  itemQty: { minWidth: 64, textAlign: 'right' },
  signatures: { flexDirection: 'row', gap: 16, marginTop: 20 },
  signature: { flex: 1, gap: 4 },
  signatureRule: { borderBottomWidth: 1, height: 28 },
});
