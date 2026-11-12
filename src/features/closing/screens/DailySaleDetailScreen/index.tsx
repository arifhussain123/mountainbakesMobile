import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getBusinessDate, useCashTransfers, useDailySaleRecords, useExpenses } from '@/api';
import { navigateToRecord, Routes, type ClosingStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, FormBottomSheet, Icon, InfoBanner, ListThumb, LoadingSkeleton, PrimaryButton, Screen, SectionHeader } from '@/shared/ui';
import { mapErrorToMessage } from '@/shared/helpers';
import { formatCurrency, formatDisplayDate } from '@/shared/utils';
import { findLikelyDeposit } from '../../calculations/depositMatch';
import { DailySaleRecordDetailSheet } from '../../components';
import { ManualFeedSheetContent } from '../ManualFeedScreen';
import { styles } from './styles';

/** A single expense above this is worth asking "was this paid from the till?" — large enough that if it was actually paid from outside the drawer, it would read as a real Cash on Table shortfall. */
const LARGE_EXPENSE_HINT_THRESHOLD = 5000;

function daysBetween(a: string, b: string): number {
  const diffMs = new Date(`${b}T00:00:00Z`).getTime() - new Date(`${a}T00:00:00Z`).getTime();
  return Math.round(diffMs / 86400000);
}

/** Day Detail — every figure with a one-line explanation (via `DailySaleRecordDetailSheet`), plus cash-expense drill-down, a best-effort linked-deposit hint, and links out to Sales/Shop Expenses/Cash Transfers. */
export function DailySaleDetailScreen() {
  const theme = useAppTheme();
  const route = useRoute<RouteProp<ClosingStackParamList, typeof Routes.DAILY_SALE_DETAIL>>();
  const { businessDate } = route.params;
  const editSheetRef = useRef<BottomSheetModal>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error, refetch } = useDailySaleRecords({ from: businessDate, to: businessDate });
  const record = data?.records.find((r) => r.businessDate === businessDate) ?? null;
  const locks = data?.locks ?? [];

  // The branch-wide expense list is a fixed last-7-business-days window with no date param — usable here only when the day is within it.
  const today = getBusinessDate();
  const withinExpenseWindow = daysBetween(businessDate, today) <= 6 && daysBetween(businessDate, today) >= 0;
  const expensesQuery = useExpenses();
  const cashExpensesForDay = useMemo(
    () =>
      withinExpenseWindow
        ? (expensesQuery.data?.expenses ?? []).filter((e) => e.date === businessDate && e.paymentMethod === 'cash')
        : null,
    [withinExpenseWindow, expensesQuery.data, businessDate],
  );

  // Best-effort client match against the backend's Finance-only deposit<->Company Share link (Step 0) — not a confirmed server link.
  const transfersQuery = useCashTransfers({ from: businessDate, to: addDaysForQuery(businessDate) });
  const likelyDeposit = useMemo(
    () => (record ? findLikelyDeposit(record.companyShare, businessDate, transfersQuery.data?.transfers ?? []) : null),
    [record, businessDate, transfersQuery.data],
  );

  const canEdit = record !== null && (record.status === 'open' || record.status === 'pending_verification');
  const rowLine = { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border };

  if (isLoading) {
    return (
      <Screen>
        <AppHeader title="Day Detail" subtitle={formatDisplayDate(businessDate)} />
        <View style={{ padding: theme.spacing.lg }}>
          <LoadingSkeleton height={220} />
        </View>
      </Screen>
    );
  }

  if (error || !record) {
    return (
      <Screen>
        <AppHeader title="Day Detail" subtitle={formatDisplayDate(businessDate)} />
        <View style={{ padding: theme.spacing.lg }}>
          <ErrorState message={error ? mapErrorToMessage(error) : 'No record for this day.'} onRetry={() => void refetch()} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen>
      <AppHeader title="Day Detail" subtitle={formatDisplayDate(businessDate)} />
      <ScrollView contentContainerStyle={styles.content}>
        <Card>
          <DailySaleRecordDetailSheet record={record} />
        </Card>

        {canEdit ? (
          <PrimaryButton
            label="Edit count"
            onPress={() => {
              setEditOpen(true);
              editSheetRef.current?.present();
            }}
          />
        ) : null}

        <SectionHeader title="Cash expenses this day" />
        <Card style={styles.listCard}>
          {cashExpensesForDay === null ? (
            <Text style={[styles.sm, styles.pad, { color: theme.colors.textFaint }]}>
              Itemized expenses are only available for the last 7 business days. Total cash expense for this day:{' '}
              {formatCurrency(record.cashExpense)}.
            </Text>
          ) : cashExpensesForDay.length === 0 ? (
            <Text style={[styles.sm, styles.pad, { color: theme.colors.textFaint }]}>No cash expenses recorded for this day.</Text>
          ) : (
            cashExpensesForDay.map((expense, i) => (
              <View key={expense.id} style={[styles.li, i > 0 && rowLine]}>
                <ListThumb icon="receipt" index={i} />
                <View style={styles.grow}>
                  <Text style={[styles.liTitle, { color: theme.colors.text }]}>{expense.description}</Text>
                  <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{expense.category}</Text>
                  {expense.amount > LARGE_EXPENSE_HINT_THRESHOLD ? (
                    <InfoBanner kind="warn" style={styles.hint}>
                      Was this paid from the till? If not, it lowers Cash on Table and shows as a difference.
                    </InfoBanner>
                  ) : null}
                </View>
                <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(expense.amount)}</Text>
              </View>
            ))
          )}
          <LinkRow label="Open Shop Expenses" onPress={() => navigateToRecord(Routes.SHOP_EXPENSES_LIST, {})} />
        </Card>

        <SectionHeader title="Sales for this day" />
        <Card style={styles.listCard}>
          <LinkRow label="Open Sales" first onPress={() => navigateToRecord(Routes.SALES_LIST, {})} />
        </Card>

        {likelyDeposit ? (
          <>
            <SectionHeader title="Company share ↔ cash deposit" />
            <Text style={[styles.xs, styles.pullUp, { color: theme.colors.textFaint }]}>
              Likely linked deposit — the same amount, else the one dated that day, else the nearest within 999. Not a confirmed server link.
            </Text>
            <Card style={styles.listCard}>
              <Pressable
                accessibilityRole="button"
                onPress={() => navigateToRecord(Routes.CASH_TRANSFER_DETAIL, { transferId: likelyDeposit.id })}
                style={styles.li}>
                <ListThumb icon="transfer" index={0} />
                <View style={styles.grow}>
                  <Text style={[styles.liTitle, { color: theme.colors.text }]}>{likelyDeposit.transferNo}</Text>
                  <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{formatDisplayDate(likelyDeposit.date)}</Text>
                </View>
                <Text style={[styles.amt, { color: theme.colors.text }]}>{formatCurrency(likelyDeposit.amount)}</Text>
              </Pressable>
            </Card>
          </>
        ) : null}
      </ScrollView>

      <FormBottomSheet
        ref={editSheetRef}
        title="Manual Feed"
        subtitle={formatDisplayDate(businessDate)}
        onRequestClose={() => editSheetRef.current?.dismiss()}
        onDismiss={() => setEditOpen(false)}>
        {editOpen ? (
          <ManualFeedSheetContent
            businessDate={businessDate}
            record={record}
            locks={locks}
            onClose={() => editSheetRef.current?.dismiss()}
          />
        ) : null}
      </FormBottomSheet>
    </Screen>
  );
}

/** A tappable "Open …" row closing a list card, with a chevron. */
function LinkRow({ label, first, onPress }: { label: string; first?: boolean; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.linkRow, first ? null : { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border }]}>
      <Text style={[styles.linkText, { color: theme.colors.primary }]}>{label}</Text>
      <Icon name="chevron-right" size={16} color={theme.colors.primary} />
    </Pressable>
  );
}

function addDaysForQuery(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}
