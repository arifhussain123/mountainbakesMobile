import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLedgerEntry, usePreviousOrderBalance, useProductionOrder } from '@/api';
import { formatMoney2 } from '@/features/finance';
import { LedgerEntryDetailSheet } from '@/features/finance/screens/FinanceLedgerListScreen/LedgerEntryDetailSheet';
import { useAppTheme } from '@/shared/theme';
import { Icon, LoadingSkeleton } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { DetailHeading, DetailRows, MONO, Pill, formatDateTime, type PillTone } from '../AdminDetail';
import { PhotoStrip } from '../PhotoStrip';
import { DEMAND_DETAIL_STATUS, recordDetailError } from '../../utils/dashboardGaps';
import { SmallButton } from './parts';

/** What a tapped reference in the records sheet opens. */
export type RecordDetailTarget = { kind: 'voucher'; id: string } | { kind: 'demand'; orderId: string; amountLabel: string; amount: number };

const DEMAND_TONE: Record<string, PillTone> = {
  pending: 'warning',
  awaiting_verification: 'info',
  verified: 'secondary',
  approved: 'success',
  rejected: 'danger',
  cancelled: 'neutral',
};

/** Rs. with two decimals; the web's `blankZero` shows nothing for a zero. */
const money = (v: number | null | undefined, blankZero = false) => (blankZero && !v ? '—' : formatMoney2(v ?? 0));

/**
 * The complete record behind a reference — the web's LedgerEntryDetailDialog
 * (a PV/RV voucher) or DemandDetailDialog (a demand number), opened over the
 * records list, which stays mounted underneath with its page and search.
 */
export function RecordDetailOverlay({ target, onClose, onOpenVoucher }: { target: RecordDetailTarget; onClose: () => void; onOpenVoucher: (id: string) => void }) {
  return target.kind === 'voucher' ? (
    <VoucherDetail key={target.id} id={target.id} onClose={onClose} onOpenVoucher={onOpenVoucher} />
  ) : (
    <DemandDetail key={target.orderId} orderId={target.orderId} amountLabel={target.amountLabel} amount={target.amount} onClose={onClose} />
  );
}

function Frame({ title, subtitle, onClose, children }: { title: string; subtitle: string; onClose: () => void; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <SafeAreaView style={[StyleSheet.absoluteFill, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingHorizontal: theme.spacing.lg }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to records" onPress={onClose} hitSlop={10}>
          <Icon name="chevron-left" color={theme.colors.text} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[theme.typography.sectionTitle, { color: theme.colors.text, fontWeight: '700' }]}>
            {title}
          </Text>
          <Text numberOfLines={2} style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>
            {subtitle}
          </Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg, paddingTop: 0, gap: 4, paddingBottom: theme.spacing.xl * 2 }}>
        {children}
        <View style={styles.close}>
          <SmallButton label="Close" onPress={onClose} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadFailed({ error, kind, onRetry }: { error: unknown; kind: 'voucher' | 'demand'; onRetry: () => void }) {
  const theme = useAppTheme();
  const { message, retry } = recordDetailError(error, kind);
  return (
    <View style={styles.failed}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.text, fontWeight: '600', textAlign: 'center' }]}>{message}</Text>
      {retry ? <SmallButton label="Retry" icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

function IdLine({ id }: { id: string }) {
  const theme = useAppTheme();
  return (
    <Text selectable style={[{ fontSize: 10, color: theme.colors.textFaint, marginTop: 12 }, MONO]}>
      ID {id}
    </Text>
  );
}

/** A voucher id that opens that voucher in place, as the web's related-voucher links do. */
function VoucherLink({ id, onPress }: { id: string; onPress: (id: string) => void }) {
  const theme = useAppTheme();
  return (
    <Pressable accessibilityRole="link" accessibilityHint="Opens that voucher" onPress={() => onPress(id)} hitSlop={6}>
      <Text numberOfLines={1} style={[theme.typography.bodySmall, { color: theme.colors.primary, fontWeight: '600', textDecorationLine: 'underline' }, MONO]}>
        {id}
      </Text>
    </Pressable>
  );
}

/**
 * `GET /finance/ledger/:id` — the Finance role's ledger-entry sheet (amount,
 * status, description and the voucher's rows), then what the web dialog adds:
 * related vouchers (tap to open), posting and edit times, attachments, the ID.
 */
function VoucherDetail({ id, onClose, onOpenVoucher }: { id: string; onClose: () => void; onOpenVoucher: (id: string) => void }) {
  const q = useLedgerEntry(id);
  const entry = q.data;
  return (
    <Frame
      title={entry ? entry.voucherNo : q.isError ? 'Voucher' : 'Loading voucher…'}
      subtitle={entry ? `${entry.debit > 0 ? 'Receipt' : 'Payment'} · ${entry.ledgerHeadName}` : 'Complete voucher record'}
      onClose={onClose}>
      {q.isError ? (
        <LoadFailed error={q.error} kind="voucher" onRetry={() => void q.refetch()} />
      ) : !entry ? (
        <LoadingSkeleton height={260} />
      ) : (
        <>
          <LedgerEntryDetailSheet entry={entry} />
          {entry.reversesEntryId || entry.reversedByEntryId ? (
            <>
              <DetailHeading title="Related vouchers" />
              <DetailRows
                rows={[
                  entry.reversesEntryId ? { label: 'Reverses', value: <VoucherLink id={entry.reversesEntryId} onPress={onOpenVoucher} /> } : null,
                  entry.reversedByEntryId ? { label: 'Reversed by', value: <VoucherLink id={entry.reversedByEntryId} onPress={onOpenVoucher} /> } : null,
                ]}
              />
            </>
          ) : null}
          <DetailHeading title="Audit" />
          <DetailRows
            rows={[
              { label: 'Posted at', value: formatDateTime(entry.postedAt) },
              entry.updatedAt
                ? { label: 'Last edited', value: `${formatDateTime(entry.updatedAt)}${entry.updatedByName ? ` · ${entry.updatedByName}` : ''}` }
                : null,
            ]}
          />
          <PhotoStrip title="Source document" photos={entry.attachments} />
          <IdLine id={entry.id} />
        </>
      )}
    </Frame>
  );
}

/**
 * `GET /production-orders/:id` and its `/previous-balance` — the web's
 * DemandDetailDialog. The amount is the figure from the row that opened it
 * (summed server-side by the dashboard's own rule), not recomputed from the
 * order's price snapshots.
 */
function DemandDetail({ orderId, amountLabel, amount, onClose }: { orderId: string; amountLabel: string; amount: number; onClose: () => void }) {
  const q = useProductionOrder(orderId);
  const order = q.data?.order;
  // Asked for only once the demand itself has loaded, as on the web.
  const prev = usePreviousOrderBalance(order ? orderId : undefined).data;
  const hasPhotos = (order?.demandPhotos?.length ?? 0) > 0 || (order?.verificationPhotos?.length ?? 0) > 0;

  return (
    <Frame
      title={order ? order.demandNumber : q.isError ? 'Demand' : 'Loading demand…'}
      subtitle={order ? `${order.branchName} · ${formatDisplayDate(order.date)}` : 'Complete demand record'}
      onClose={onClose}>
      {q.isError ? (
        <LoadFailed error={q.error} kind="demand" onRetry={() => void q.refetch()} />
      ) : !order ? (
        <LoadingSkeleton height={260} />
      ) : (
        <>
          <DetailHeading title="Demand" />
          <DetailRows
            rows={[
              { label: 'Demand no.', value: order.demandNumber, mono: true },
              { label: 'Business date', value: formatDisplayDate(order.date) },
              order.requiredDate ? { label: 'Required by', value: formatDisplayDate(order.requiredDate) } : null,
              { label: 'Branch', value: order.branchName },
              { label: 'Status', value: <Pill label={DEMAND_DETAIL_STATUS[order.status] ?? order.status} tone={DEMAND_TONE[order.status] ?? 'neutral'} /> },
            ]}
          />

          <DetailHeading title={amountLabel} />
          <DetailRows rows={[{ label: amountLabel, value: money(amount) }]} />

          {prev ? (
            <>
              <DetailHeading title="Previous delivery" />
              {prev.previous ? (
                <DetailRows
                  rows={[
                    { label: 'Previous demand', value: prev.previous.demandNumber, mono: true },
                    { label: 'Previous amount', value: money(prev.companyShareValue) },
                    { label: 'Return amount', value: money(prev.returnsValue, true) },
                    prev.discountsValue ? { label: 'Discount amount', value: money(prev.discountsValue) } : null,
                    { label: 'Received amount', value: money(prev.paymentsReceivedValue, true) },
                    { label: 'Remaining balance', value: money(prev.remainingBalance ?? prev.amountToCollect) },
                  ]}
                />
              ) : (
                <Note text="No earlier delivery to this branch — nothing owed coming in." />
              )}
            </>
          ) : null}

          {order.changeReason ? (
            <>
              <DetailHeading title="Change reason" />
              <Note text={order.changeReason} strong />
            </>
          ) : null}

          {order.status === 'cancelled' && order.cancelReason ? (
            <>
              <DetailHeading title="Cancellation" />
              <Note text={order.cancelReason} strong />
              <DetailRows
                rows={[
                  { label: 'Cancelled by', value: order.cancelledByName ?? '—' },
                  order.cancelledAt ? { label: 'Cancelled at', value: formatDateTime(order.cancelledAt) } : null,
                ]}
              />
            </>
          ) : null}

          {hasPhotos ? (
            <>
              <DetailHeading title="Attachments" />
              <PhotoStrip title="Demand photo" photos={order.demandPhotos} />
              <PhotoStrip title="Verification photo" photos={order.verificationPhotos} />
            </>
          ) : null}

          <IdLine id={order.id} />
        </>
      )}
    </Frame>
  );
}

function Note({ text, strong }: { text: string; strong?: boolean }) {
  const theme = useAppTheme();
  return <Text style={[theme.typography.bodySmall, { color: strong ? theme.colors.text : theme.colors.textSecondary, paddingVertical: 6 }]}>{text}</Text>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 14 },
  failed: { alignItems: 'center', gap: 12, paddingVertical: 32 },
  close: { alignItems: 'flex-end', marginTop: 16 },
});
