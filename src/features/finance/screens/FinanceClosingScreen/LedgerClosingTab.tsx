import { useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useQueryClient } from '@tanstack/react-query';
import {
  generateIdempotencyKey,
  getBusinessDate,
  queryKeys,
  useCloseFinanceDay,
  useDayClosing,
  useDayClosingHistory,
  useFinanceCashTransfers,
  useFinanceDailySales,
  usePendingApprovals,
  type FinanceDayClosing,
} from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Card, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, PrimaryButton, SecondaryButton, StatCard, StatusBadge } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { mapErrorToMessage, requestDeviceReauth } from '@/shared/helpers';
import { useFinanceCan } from '../../hooks/useFinanceCan';
import { dateAttention } from '../../utils/branchSalesAttention';
import { closeOrderBlocker, computeClosingChecklist, oldestOpenDay, shiftDate } from '../../utils/closingChecklist';
import { formatMoney2, formatStamp } from '../../utils/financeFormat';
import { branchSalesWindow } from './BranchSalesTab';
import { CloseDaySheetContent } from './CloseDaySheetContent';
import { styles } from './styles';

const HISTORY_DAYS = 30;

function Figures({ day }: { day: FinanceDayClosing }) {
  const theme = useAppTheme();
  return (
    <View>
      <View style={styles.statsRow}>
        <StatCard label="Opening" value={formatMoney2(day.openingBalance)} />
        <StatCard label="Closing" value={formatMoney2(day.closingBalance)} />
      </View>
      <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
        <StatCard label="Income" value={formatMoney2(day.totalIncome)} valueColor={theme.colors.success} />
        <StatCard label="Expenses" value={formatMoney2(day.totalExpenses)} valueColor={theme.colors.danger} />
      </View>
      <View style={[styles.statsRow, { marginTop: theme.spacing.sm }]}>
        <StatCard label="Cash in Hand" value={formatMoney2(day.cashInHand)} />
        <StatCard label="Bank" value={formatMoney2(day.bankBalance)} />
      </View>
      <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>
        Opening {formatMoney2(day.openingBalance)} + income {formatMoney2(day.totalIncome)} − expenses {formatMoney2(day.totalExpenses)} = closing{' '}
        {formatMoney2(day.closingBalance)} · {day.entryCount} {day.entryCount === 1 ? 'voucher' : 'vouchers'}
      </Text>
    </View>
  );
}

/**
 * LEDGER CLOSING — sign one business date off, in order.
 *
 * The server refuses only a future day, an already-closed day and a day with
 * pending documents. Order is enforced here: the closer is sent to the oldest
 * open day (within the history the server lists) and a later day's Close
 * button says why it is waiting. Everything else is the checklist's to show.
 */
export function LedgerClosingTab() {
  const theme = useAppTheme();
  const queryClient = useQueryClient();
  const can = useFinanceCan();
  const canClose = can('approve');
  const today = getBusinessDate();

  const history = useDayClosingHistory(HISTORY_DAYS);
  const closedDates = useMemo(() => (history.data ?? []).map((c) => c.businessDate), [history.data]);
  // The first day the order rule looks back to: the oldest closing on record in
  // the history window, else the window's own start.
  const firstDate = useMemo(
    () => (closedDates.length ? closedDates.reduce((a, b) => (a < b ? a : b)) : shiftDate(today, -(HISTORY_DAYS - 1))),
    [closedDates, today],
  );
  const oldestOpen = history.data ? oldestOpenDay(closedDates, firstDate, today) : null;

  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? oldestOpen ?? today;

  const day = useDayClosing(date);
  const previous = useDayClosing(shiftDate(date, -1), { enabled: date > firstDate });
  const pending = usePendingApprovals();
  const pendingTransfers = useFinanceCashTransfers({ status: 'pending', from: date, to: date, limit: 50 });
  const sales = useFinanceDailySales(branchSalesWindow(today));

  const pendingForDate = (pending.data ?? []).filter((p) => p.date.slice(0, 10) === date).length + (pendingTransfers.data?.total ?? 0);
  const salesForDate = dateAttention(sales.data?.records ?? [], date, (sales.data?.unmatchedDeposits ?? []).map((d) => d.businessDate));
  const previousDayClosed = date <= firstDate || previous.data?.status === 'closed' || closedDates.includes(shiftDate(date, -1));
  const checklist = computeClosingChecklist({ pendingApprovals: pendingForDate, ...salesForDate, previousDayClosed });
  const orderBlocker = history.data ? closeOrderBlocker(date, closedDates, firstDate, today) : null;
  const pendingBlocker = pendingForDate > 0 ? 'Approve or reject the pending items for this date first.' : null;

  const sheetRef = useRef<BottomSheetModal>(null);
  const close = useCloseFinanceDay();
  const closeKey = useMemo(() => generateIdempotencyKey(`finance_closing_${date}`), [date]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const refetchAll = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.dayClosing(date) });
    void queryClient.invalidateQueries({ queryKey: queryKeys.dayClosing(shiftDate(date, 1)) });
    void history.refetch();
  };

  const confirmClose = async () => {
    const auth = await requestDeviceReauth(`Close ${formatDisplayDate(date)}`);
    if (auth === 'cancelled') return;
    const send = () =>
      close.mutate(
        { businessDate: date, idempotencyKey: closeKey },
        {
          onSuccess: () => {
            sheetRef.current?.dismiss();
            setPicked(null);
            refetchAll();
          },
          onError: (e) => Alert.alert('Could Not Close', mapErrorToMessage(e)),
        },
      );
    if (auth === 'unavailable') {
      Alert.alert('No Screen Lock', 'This phone has no screen lock, so only the typed date confirms this closing.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Close Day', style: 'destructive', onPress: send },
      ]);
      return;
    }
    send();
  };

  const isLoading = day.isLoading || history.isLoading;
  const firstError = day.error ?? history.error;

  return (
    <ScrollView
      contentContainerStyle={{ padding: theme.spacing.lg }}
      keyboardShouldPersistTaps="handled">
      {oldestOpen && oldestOpen !== date ? (
        <Card style={{ marginBottom: theme.spacing.md }}>
          <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>
            Oldest open day: <Text style={{ fontWeight: '700' }}>{formatDisplayDate(oldestOpen)}</Text>. Days close in order.
          </Text>
          <View style={{ marginTop: theme.spacing.sm }}>
            <SecondaryButton label="Review oldest open day" onPress={() => setPicked(oldestOpen)} />
          </View>
        </Card>
      ) : null}

      <View style={[styles.row, { marginBottom: theme.spacing.md }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Previous day" onPress={() => setPicked(shiftDate(date, -1))} style={styles.stepButton}>
          <Icon name="chevron-left" size={20} color={theme.colors.text} />
        </Pressable>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>{formatDisplayDate(date)}</Text>
          {day.data ? (
            <StatusBadge label={day.data.status === 'closed' ? 'Closed' : 'Open'} variant={day.data.status === 'closed' ? 'neutral' : 'success'} />
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next day"
          accessibilityState={{ disabled: date >= today }}
          disabled={date >= today}
          onPress={() => setPicked(shiftDate(date, 1))}
          style={[styles.stepButton, { opacity: date >= today ? 0.3 : 1 }]}>
          <Icon name="chevron-right" size={20} color={theme.colors.text} />
        </Pressable>
      </View>

      {isLoading ? <LoadingSkeleton height={180} /> : null}
      {firstError ? <ErrorState message={mapErrorToMessage(firstError)} onRetry={refetchAll} /> : null}

      {day.data ? (
        <Card>
          <Figures day={day.data} />
          {day.data.status === 'closed' ? (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>
              Closed by {day.data.closedByName ?? '—'} · {formatStamp(day.data.closedAt)}
            </Text>
          ) : null}
        </Card>
      ) : null}

      {day.data?.status === 'open' ? (
        <Card style={{ marginTop: theme.spacing.md }}>
          <Text style={[theme.typography.cardTitle, { color: theme.colors.text }]}>Before closing</Text>
          {checklist.map((item) => (
            <View key={item.key} style={styles.checkRow} accessible accessibilityLabel={`${item.state === 'ok' ? 'Clear' : 'Needs attention'}: ${item.label}. ${item.hint ?? ''}`}>
              <Icon name={item.state === 'ok' ? 'check' : 'warning'} size={16} color={item.state === 'ok' ? theme.colors.success : theme.colors.warning} />
              <View style={{ flex: 1 }}>
                <Text style={[theme.typography.bodySmall, { color: theme.colors.text }]}>{item.label}</Text>
                {item.hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 2 }]}>{item.hint}</Text> : null}
              </View>
            </View>
          ))}
          {canClose ? (
            <View style={{ marginTop: theme.spacing.lg }}>
              {orderBlocker || pendingBlocker ? (
                <Text style={[theme.typography.label, { color: theme.colors.warning, marginBottom: theme.spacing.sm }]}>{orderBlocker ?? pendingBlocker}</Text>
              ) : null}
              <PrimaryButton label="Close this day" onPress={() => sheetRef.current?.present()} disabled={Boolean(orderBlocker || pendingBlocker)} />
            </View>
          ) : (
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: theme.spacing.md }]}>Your role can view closings but not close a day.</Text>
          )}
        </Card>
      ) : null}

      <Text style={[theme.typography.sectionTitle, { color: theme.colors.text, marginTop: theme.spacing.lg }]}>Recent closings</Text>
      {history.data && history.data.length === 0 ? (
        <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: theme.spacing.sm }]}>No day was closed in the last {HISTORY_DAYS} days.</Text>
      ) : null}
      {(history.data ?? []).map((item) => {
        const open = expanded === item.businessDate;
        return (
          <Card key={item.businessDate} style={{ marginTop: theme.spacing.sm }}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${formatDisplayDate(item.businessDate)}, closed by ${item.closedByName ?? 'unknown'}. ${open ? 'Hide' : 'Show'} the locked figures.`}
              onPress={() => setExpanded(open ? null : item.businessDate)}>
              <View style={styles.row}>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatDisplayDate(item.businessDate)}</Text>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatMoney2(item.closingBalance)}</Text>
              </View>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>
                Closed by {item.closedByName ?? '—'} · {formatStamp(item.closedAt)}
              </Text>
            </Pressable>
            {open ? (
              <View style={{ marginTop: theme.spacing.md }}>
                <Figures day={item} />
              </View>
            ) : null}
          </Card>
        );
      })}

      <FormBottomSheet ref={sheetRef} title="Close this day" subtitle={formatDisplayDate(date)} onRequestClose={() => sheetRef.current?.dismiss()} snapPoints={['70%']}>
        <CloseDaySheetContent
          date={date}
          checklist={checklist}
          closing={close.isPending}
          onConfirm={() => void confirmClose()}
          onCancel={() => sheetRef.current?.dismiss()}
        />
      </FormBottomSheet>
    </ScrollView>
  );
}
