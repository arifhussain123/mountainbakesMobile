import React, { useCallback, useMemo, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  MBButton,
  MBEmptyState,
  MBErrorState,
  MBFab,
  MBHeader,
  MBInput,
  MBPressable,
  MBSkeletonList,
  MBSyncStatus,
  MBWriteOutcome,
  writeOutcomeCopy,
  MBSelect,
  MBDateFilter,
  dateFilterLabel,
  dateRangeFor,
  MBModal,
  MBExpenseCard,
  MBDataRow,
  MBMoney,
} from '@/components';
import { useCreateExpense, type SaveOutcome } from '@/hooks/useCreateExpense';
import { getExpenses } from '@/services/api/expensesApi';
import { qk } from '@/services/query/queryKeys';
import { z } from 'zod';
import {
  CreateExpenseSchema,
  EXPENSE_CATEGORIES,
  EXPENSE_PAYMENT_METHODS,
  type CreateExpenseInput,
} from '@/shared/schemas/expense.schemas';
import type { Expense } from '@/shared/types/expense.types';
import { useTheme } from '@/theme/ThemeProvider';
import type { DateFilterKey, WriteOutcomeCopy, WriteSubject } from '@/components';
import { parseCurrency } from '@/utils/money';
import { dataAsOfFrom } from '@/utils/dataAsOf';
import { contentColumn, layout, space } from '@/theme/spacing';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';

/**
 * Shop expenses — the first fully offline-capable write.
 *
 * Creating an expense always goes through the local database and the sync queue,
 * online or not. The confirmation wording follows suit: "Saved" only once the
 * server has confirmed, "Saved offline" otherwise. Telling someone an expense is
 * saved when it is sitting in a queue is how the same expense gets entered twice.
 */
const ALL_CATEGORIES = '__all__';

/**
 * Ranges the server will actually serve.
 *
 * `/api/expenses` bounds how far back it will look — the route's own comment
 * names a 7-day cutoff backed by an index — so these stop at 30 days rather than
 * offering an "all time" that would be refused or slow. `to` is always today:
 * an expense cannot be filed for the future.
 */

export function ExpensesScreen(): React.ReactElement {
  const theme = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [banner, setBanner] = useState<WriteOutcomeCopy | null>(null);

  const [range, setRange] = useState<DateFilterKey>('today');
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const [searchInput, setSearchInput] = useState('');
  // Debounced only to keep the filter cheap while typing; the search itself is
  // local, so there is no request behind it.
  const search = useDebouncedValue(searchInput.trim().toLowerCase(), 200);

  /*
   * Range and category go to the server — `/api/expenses` takes `from`, `to` and
   * `category`, and the server bounds the range anyway. Search does not: there
   * is no search parameter on that endpoint, so filtering the fetched range in
   * memory is the honest option. It means search only reaches what the current
   * range loaded, which is why the range chips sit beside it rather than being
   * buried.
   *
   * `branchId` is deliberately never sent. Branch roles are auto-scoped
   * server-side, and sending one would be the client choosing its own scope.
   */
  const filters = useMemo(
    () => ({
      ...dateRangeFor(range),
      ...(category === ALL_CATEGORIES ? {} : { category }),
    }),
    [range, category],
  );

  const expenses = useQuery({
    queryKey: qk.expenses.list(filters),
    queryFn: () => getExpenses(filters),
  });

  const rows = useMemo(() => {
    const all = expenses.data ?? [];
    if (!search) return all;
    return all.filter(e =>
      [e.description, e.category, e.expenseNumber, e.paymentMethod]
        .join(' ')
        .toLowerCase()
        .includes(search),
    );
  }, [expenses.data, search]);

  const renderItem = useCallback(
    ({ item }: { item: Expense }) => <MBExpenseCard expense={item} />,
    [],
  );

  const onSaved = useCallback(
    (outcome: SaveOutcome, reason?: string) => {
      setShowForm(false);
      setBanner(
        writeOutcomeCopy(outcome, EXPENSE, reason),
      );
      expenses.refetch();
    },
    [expenses],
  );

  /**
   * Exactly one "Add expense" control is on screen at any moment.
   *
   * The empty state carries it while the list is genuinely empty — it is the
   * better teacher there, and it sits where the eye already is. Everywhere else,
   * including while the list is still loading or has failed, the FAB does.
   * Recording an expense does not depend on the list, and making the operator
   * wait for a fetch before they can log one is how a slip of paper ends up
   * being the system of record.
   */
  const emptyStateShowing =
    !expenses.isPending && !expenses.isError && rows.length === 0;

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader
        title="Expenses"
        subtitle={dateFilterLabel(range)}
        right={<MBSyncStatus />}
        dataAsOf={dataAsOfFrom(expenses.dataUpdatedAt)}
        search={{
          value: searchInput,
          onChangeText: setSearchInput,
          placeholder: 'Search description, category or number',
          testID: 'expense-search',
        }}
      />

      {banner ? (
        // Tapping the banner dismisses it. Without a role that affordance is
        // invisible to a screen reader, which otherwise reads the message and
        // gives no way to clear it. The label stays unset on purpose: the
        // banner text is the announcement, and a label here would replace it.
        <MBPressable
          onPress={() => setBanner(null)}
          accessibilityRole="button"
          accessibilityHint="Dismisses this message"
          // A full-width band pulling in at its edges reads as the message
          // shrinking rather than as a control answering a touch.
          feedback="opacity">
          <View style={{ marginHorizontal: theme.layout.screenPad }}>
            <MBWriteOutcome copy={banner} />
          </View>
        </MBPressable>
      ) : null}

      {/* Two rails rather than a filter sheet: both are one tap, both stay
          visible, and the current filter is readable without opening anything.
          Horizontal so they never push the list down as options grow. */}
      <View style={styles.filters}>
        <MBDateFilter value={range} onChange={setRange} testIDPrefix="range" />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.space.sm, paddingHorizontal: theme.layout.screenPad }}>
          {[ALL_CATEGORIES, ...EXPENSE_CATEGORIES].map(option => {
            const selected = option === category;
            const label = option === ALL_CATEGORIES ? 'All' : option;
            return (
              <MBPressable
                key={option}
                onPress={() => setCategory(option)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`Category: ${label}`}
                style={[
                  styles.chip,
                  {
                    borderRadius: theme.radius.pill,
                    borderColor: selected ? theme.colors.accent : theme.colors.border,
                    backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surface,
                  },
                ]}>
                <Text
                  style={[
                    theme.type.caption,
                    { color: selected ? theme.colors.accent : theme.colors.text },
                  ]}>
                  {label}
                </Text>
              </MBPressable>
            );
          })}
        </ScrollView>
      </View>

      {expenses.isPending ? (
        <MBSkeletonList rows={6} />
      ) : expenses.isError ? (
        <MBErrorState
          error={expenses.error}
          onRetry={() => expenses.refetch()}
          retrying={expenses.isFetching}
        />
      ) : rows.length === 0 ? (
        <MBEmptyState
          title="No expenses today"
          message="Expenses you record today will appear here."
          actionLabel="Add expense"
          onAction={() => setShowForm(true)}
          // The five-drawing set has no expenses piece, so this takes the icon
          // treatment rather than borrowing a drawing that means something else.
          icon="expenses"
        />
      ) : (
        /* Virtualised, not a mapped ScrollView. The range chips reach "This
           month", and a month at a busy branch is a few hundred expenses — a
           ScrollView mounts every one of them before the first is on screen. */
        <FlashList
          data={rows}
          renderItem={renderItem}
          keyExtractor={keyOf}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={ListSeparator}
          refreshControl={
            <RefreshControl
              refreshing={expenses.isFetching && !expenses.isPending}
              onRefresh={() => expenses.refetch()}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {!emptyStateShowing ? (
        <MBFab label="Add expense" testID="add-expense" onPress={() => setShowForm(true)} />
      ) : null}

      <MBModal visible={showForm} onRequestClose={() => setShowForm(false)}>
        <ExpenseForm onCancel={() => setShowForm(false)} onSaved={onSaved} />
      </MBModal>
    </View>
  );
}

/**
 * Memoised. The list re-renders on every chip tap and every refetch; with a
 * stable prop none of the visible rows re-render with it. Theme changes still
 * reach it — context bypasses `memo`.
 */

type ExpenseFormValues = z.input<typeof CreateExpenseSchema>;

function ExpenseForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (outcome: SaveOutcome, reason?: string) => void;
}): React.ReactElement {
  const theme = useTheme();
  const { createExpense, isSaving } = useCreateExpense();
  const [submitError, setSubmitError] = useState<string | null>(null);

  // `remarks` has a Zod .default(''), so the schema's INPUT type (what the form
  // holds) and OUTPUT type (what the resolver produces) differ. React Hook Form
  // needs both, or the resolver and the submit handler disagree.
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ExpenseFormValues, unknown, CreateExpenseInput>({
    resolver: zodResolver(CreateExpenseSchema),
    defaultValues: {
      category: EXPENSE_CATEGORIES[0],
      description: '',
      paymentMethod: EXPENSE_PAYMENT_METHODS[0],
      amount: 0,
      remarks: '',
    },
  });

  const category = watch('category');
  const paymentMethod = watch('paymentMethod');

  /**
   * The validated values, held between "Save expense" and the confirm.
   *
   * Set only by `handleSubmit`, so the review step can never show a value the
   * schema rejected — the errors belong on the fields that caused them, not on
   * a summary of them. Non-null IS the confirm step; there is no second flag to
   * fall out of step with it.
   */
  const [pending, setPending] = useState<CreateExpenseInput | null>(null);

  // Step 5 -> 6. Validation runs here, so the confirm is only ever reached by a
  // form the schema already accepted.
  const onReview = (values: CreateExpenseInput) => {
    setSubmitError(null);
    setPending(values);
  };

  const onConfirm = async () => {
    if (!pending) return;
    setSubmitError(null);
    try {
      const result = await createExpense(pending);
      onSaved(result.outcome, result.reason);
    } catch (error) {
      // Stay on the confirm: the values are right there to check against, and
      // dropping back to the form would hide what was being confirmed.
      setSubmitError(error instanceof Error ? error.message : 'Could not save the expense.');
    }
  };

  if (pending) {
    return (
      <ExpenseConfirm
        values={pending}
        isSaving={isSaving}
        submitError={submitError}
        onEdit={() => setPending(null)}
        onConfirm={onConfirm}
      />
    );
  }

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Add expense" onBack={onCancel} />
      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <MBSelect
          label="Category"
          options={EXPENSE_CATEGORIES}
          value={category}
          onChange={next => setValue('category', next, { shouldValidate: true })}
          error={errors.category?.message}
          testIDPrefix="category"
        />

        <Controller
          control={control}
          name="amount"
          render={({ field: { onChange, value } }) => (
            <MBInput
              label="Amount"
              required
              numeric
              keyboardType="decimal-pad"
              value={value ? String(value) : ''}
              onChangeText={text => onChange(parseCurrency(text))}
              error={errors.amount?.message}
              editable={!isSaving}
              placeholder="0"
            />
          )}
        />

        <Controller
          control={control}
          name="description"
          render={({ field: { onChange, onBlur, value } }) => (
            <MBInput
              label="Description"
              required
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.description?.message}
              editable={!isSaving}
              maxLength={200}
            />
          )}
        />

        {/* Only cash and easypaisa — shop expenses do not settle by card or
            bank transfer, and the server enforces the same two. */}
        <MBSelect
          label="Payment method"
          options={EXPENSE_PAYMENT_METHODS}
          value={paymentMethod}
          onChange={next => setValue('paymentMethod', next, { shouldValidate: true })}
          error={errors.paymentMethod?.message}
          testIDPrefix="expense-payment"
        />

        <Controller
          control={control}
          name="remarks"
          render={({ field: { onChange, onBlur, value } }) => (
            <MBInput
              label="Remarks"
              value={value ?? ''}
              onChangeText={onChange}
              onBlur={onBlur}
              error={errors.remarks?.message}
              editable={!isSaving}
              maxLength={500}
            />
          )}
        />

        <MBButton
          label="Review expense"
          onPress={handleSubmit(onReview)}
          fullWidth
          testID="save-expense"
        />
        <MBButton label="Cancel" onPress={onCancel} variant="ghost" size="md" />
      </ScrollView>
    </View>
  );
}

/**
 * Step 6 — the confirm.
 *
 * ---------------------------------------------------------------------------
 * Why an expense gets one at all
 * ---------------------------------------------------------------------------
 * `/api/expenses` is **create-only**: there is no PUT, no PATCH and no DELETE
 * on the server, and the mobile client carries only `getExpenses`. A filed
 * expense cannot be edited or withdrawn from anywhere in this app. So the
 * realistic error — 5000 typed where 500 was meant — is permanent the moment
 * Save is pressed, and this screen is the last place it can be caught.
 *
 * That is why the amount is the hero figure rather than another labelled row.
 * A transposed digit is invisible in a list of five fields and obvious at
 * `moneyLg`, which is the one thing this step has to make obvious.
 *
 * ---------------------------------------------------------------------------
 * A step, not a sheet
 * ---------------------------------------------------------------------------
 * The form is already inside a full-screen `MBModal`, and RN's `Modal` nested
 * in another `Modal` is unreliable on Android — the inner one can simply not
 * appear. `MBConfirmDialog` is right on a plain screen (the stock return uses
 * it); here the confirm replaces the form inside the modal that is already up.
 *
 * The fields keep their values behind it: react-hook-form retains state when
 * inputs unmount (`shouldUnregister` defaults to false), so Edit returns to a
 * filled form rather than an empty one.
 */
function ExpenseConfirm({
  values,
  isSaving,
  submitError,
  onEdit,
  onConfirm,
}: {
  values: CreateExpenseInput;
  isSaving: boolean;
  submitError: string | null;
  onEdit: () => void;
  onConfirm: () => void;
}): React.ReactElement {
  const theme = useTheme();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Confirm expense" subtitle="Check before saving" onBack={onEdit} />

      <ScrollView
        contentContainerStyle={[
          contentColumn,
          { padding: theme.layout.screenPad, gap: theme.space.lg },
        ]}
        keyboardShouldPersistTaps="handled">
        <View style={styles.amount}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Amount</Text>
          <MBMoney value={values.amount} size="lg" testID="confirm-amount" />
        </View>

        <View>
          <MBDataRow label="Category" value={values.category} />
          <MBDataRow label="Description" value={values.description} />
          <MBDataRow label="Payment method" value={PAYMENT_LABELS[values.paymentMethod]} />
          {values.remarks ? <MBDataRow label="Remarks" value={values.remarks} /> : null}
        </View>

        <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
          An expense cannot be edited or deleted once it is filed.
        </Text>

        {submitError ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {submitError}
          </Text>
        ) : null}

        <MBButton
          label="Save expense"
          onPress={onConfirm}
          loading={isSaving}
          fullWidth
          testID="confirm-expense"
        />
        <MBButton label="Edit" onPress={onEdit} variant="ghost" size="md" disabled={isSaving} />
      </ScrollView>
    </View>
  );
}

/** The stored values are lower-case; these are how they are read aloud. */
const PAYMENT_LABELS: Record<(typeof EXPENSE_PAYMENT_METHODS)[number], string> = {
  cash: 'Cash',
  easypaisa: 'Easypaisa',
};

/**
 * Outcome → colour.
 *
 * `refused` is a third tone, not a variant of `queued`: the server rejected the
 * write (a 409 for insufficient stock, say) and it will never sync by itself.
 * Painting that amber alongside "it will sync automatically" is how a sale that
 * never landed goes unnoticed until the till is reconciled.
 */
/** Shared wording for a refused write. */
const EXPENSE: WriteSubject = {
  noun: 'expense',
  confirmed: 'Expense saved.',
  refusedNote: 'do not enter it again',
};

/** Module scope: a key or separator built during render re-keys the list each pass. */
function keyOf(expense: Expense): string {
  return expense.id;
}

function ListSeparator(): React.ReactElement {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  filters: { gap: space.sm, paddingVertical: space.sm },
  // ...contentColumn caps the measure on a tablet, as the other lists do.
  listContent: { ...contentColumn, paddingHorizontal: space.lg, paddingBottom: space.xxl },
  separator: { height: space.sm },
  flex: { flex: 1 },
  amount: { gap: space.hair },
  cardTop: { flexDirection: 'row', gap: space.md, marginBottom: space.tight },
  cardMain: { flex: 1, gap: space.hair },
  group: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    height: layout.chipH,
    paddingHorizontal: space.snug,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
