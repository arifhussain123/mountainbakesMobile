import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { getBusinessDate, useCashTransfers, useDailySaleRecords, useExpenses } from '@/api';
import { navigateToRecord, Routes, type ClosingStackParamList } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { AppHeader, Card, ErrorState, FormBottomSheet, Icon, LoadingSkeleton, Screen } from '@/shared/ui';
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
      <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
        <Card>
          <DailySaleRecordDetailSheet record={record} />
        </Card>

        <View style={styles.section}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>CASH EXPENSES THIS DAY</Text>
          {cashExpensesForDay === null ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint, marginTop: 6 }]}>
              Itemized expenses are only available for the last 7 business days. Total cash expense for this day:{' '}
              {formatCurrency(record.cashExpense)}.
            </Text>
          ) : cashExpensesForDay.length === 0 ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.textFaint, marginTop: 6 }]}>No cash expenses recorded for this day.</Text>
          ) : (
            cashExpensesForDay.map((expense) => (
              <View key={expense.id} style={styles.expenseRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[theme.typography.body, { color: theme.colors.text }]}>{expense.description}</Text>
                  <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>{expense.category}</Text>
                  {expense.amount > LARGE_EXPENSE_HINT_THRESHOLD ? (
                    <View style={[styles.hintCard, { borderColor: theme.colors.warning, backgroundColor: `${theme.colors.warning}17` }]}>
                      <Text style={[theme.typography.label, { color: theme.colors.text }]}>
                        Was this paid from the till? If not, it lowers Cash on Table and shows as a difference.
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(expense.amount)}</Text>
              </View>
            ))
          )}
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateToRecord(Routes.SHOP_EXPENSES_LIST, {})}
            style={[styles.linkRow, { borderBottomColor: theme.colors.border, marginTop: 10 }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>Open Shop Expenses</Text>
            <Icon name="chevron-right" size={16} color={theme.colors.textFaint} />
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>SALES FOR THIS DAY</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigateToRecord(Routes.SALES_LIST, {})}
            style={[styles.linkRow, { borderBottomColor: theme.colors.border, marginTop: 6 }]}>
            <Text style={[theme.typography.body, { color: theme.colors.text }]}>Open Sales</Text>
            <Icon name="chevron-right" size={16} color={theme.colors.textFaint} />
          </Pressable>
        </View>

        {likelyDeposit ? (
          <View style={styles.section}>
            <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>COMPANY SHARE ↔ CASH DEPOSIT</Text>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 4 }]}>
              Likely linked deposit — matched by amount, not a confirmed server link.
            </Text>
            <Pressable
              accessibilityRole="button"
              onPress={() => navigateToRecord(Routes.CASH_TRANSFER_DETAIL, { transferId: likelyDeposit.id })}
              style={[styles.linkRow, { borderBottomColor: theme.colors.border, marginTop: 6 }]}>
              <View>
                <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{likelyDeposit.transferNo}</Text>
                <Text style={[theme.typography.label, { color: theme.colors.textFaint, marginTop: 2 }]}>{formatDisplayDate(likelyDeposit.date)}</Text>
              </View>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{formatCurrency(likelyDeposit.amount)}</Text>
            </Pressable>
          </View>
        ) : null}

        {canEdit ? (
          <View style={[styles.section, { flexDirection: 'row' }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setEditOpen(true);
                editSheetRef.current?.present();
              }}
              style={{ paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: theme.colors.primary }}>
              <Text style={[theme.typography.label, { color: theme.colors.primaryText, fontWeight: '700' }]}>Edit count</Text>
            </Pressable>
          </View>
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

function addDaysForQuery(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 2);
  return d.toISOString().slice(0, 10);
}
