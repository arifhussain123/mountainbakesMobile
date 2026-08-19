import React, { useCallback, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
  MBButton,
  MBCard,
  MBEmptyState,
  MBErrorState,
  MBHeader,
  MBInput,
  MBSkeletonList,
  MBSyncStatus,
} from '@/components';
import { useCreateExpense } from '@/hooks/useCreateExpense';
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
import { businessDateStr } from '@/shared/utils/timezone';
import { useTheme } from '@/theme/ThemeProvider';
import { formatCurrency, parseCurrency } from '@/utils/money';

/**
 * Shop expenses — the first fully offline-capable write.
 *
 * Creating an expense always goes through the local database and the sync queue,
 * online or not. The confirmation wording follows suit: "Saved" only once the
 * server has confirmed, "Saved offline" otherwise. Telling someone an expense is
 * saved when it is sitting in a queue is how the same expense gets entered twice.
 */
export function ExpensesScreen(): React.ReactElement {
  const theme = useTheme();
  const [showForm, setShowForm] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'queued'; text: string } | null>(null);

  const filters = { from: businessDateStr(), to: businessDateStr() };
  const expenses = useQuery({
    queryKey: qk.expenses.list(filters),
    queryFn: () => getExpenses(filters),
  });

  const onSaved = useCallback(
    (outcome: 'synced' | 'queued') => {
      setShowForm(false);
      setBanner(
        outcome === 'synced'
          ? { tone: 'ok', text: 'Expense saved.' }
          : {
              tone: 'queued',
              text: 'Saved offline — it will sync automatically when you reconnect.',
            },
      );
      expenses.refetch();
    },
    [expenses],
  );

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Expenses" subtitle="Today" right={<MBSyncStatus />} />

      {banner ? (
        <Pressable onPress={() => setBanner(null)}>
          <View
            style={[
              styles.banner,
              {
                backgroundColor:
                  banner.tone === 'ok' ? theme.colors.successBg : theme.colors.warningBg,
                marginHorizontal: theme.layout.screenPad,
                borderRadius: theme.radius.md,
              },
            ]}>
            <Text
              accessibilityRole="alert"
              style={[
                theme.type.label,
                { color: banner.tone === 'ok' ? theme.colors.success : theme.colors.warning },
              ]}>
              {banner.text}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <View style={{ padding: theme.layout.screenPad }}>
        <MBButton
          label="Add expense"
          testID="add-expense"
          onPress={() => setShowForm(true)}
          fullWidth
        />
      </View>

      {expenses.isPending ? (
        <MBSkeletonList rows={6} />
      ) : expenses.isError ? (
        <MBErrorState
          error={expenses.error}
          onRetry={() => expenses.refetch()}
          retrying={expenses.isFetching}
        />
      ) : (expenses.data ?? []).length === 0 ? (
        <MBEmptyState
          title="No expenses today"
          message="Expenses you record today will appear here."
          actionLabel="Add expense"
          onAction={() => setShowForm(true)}
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.sm }}
          refreshControl={
            <RefreshControl
              refreshing={expenses.isFetching && !expenses.isPending}
              onRefresh={() => expenses.refetch()}
              tintColor={theme.colors.primary}
            />
          }>
          {(expenses.data ?? []).map(expense => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" onRequestClose={() => setShowForm(false)}>
        <ExpenseForm onCancel={() => setShowForm(false)} onSaved={onSaved} />
      </Modal>
    </View>
  );
}

function ExpenseCard({ expense }: { expense: Expense }): React.ReactElement {
  const theme = useTheme();
  return (
    <MBCard>
      <View style={styles.cardTop}>
        <View style={styles.cardMain}>
          <Text style={[theme.type.bodyStrong, { color: theme.colors.text }]}>
            {expense.category}
          </Text>
          <Text style={[theme.type.caption, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {expense.description}
          </Text>
        </View>
        <Text style={[theme.type.money, { color: theme.colors.text }]}>
          {formatCurrency(expense.amount)}
        </Text>
      </View>
      <Text style={[theme.type.caption, { color: theme.colors.textMuted }]}>
        {expense.paymentMethod} · {expense.expenseNumber}
      </Text>
    </MBCard>
  );
}

type ExpenseFormValues = z.input<typeof CreateExpenseSchema>;

function ExpenseForm({
  onCancel,
  onSaved,
}: {
  onCancel: () => void;
  onSaved: (outcome: 'synced' | 'queued') => void;
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

  const onSubmit = async (values: CreateExpenseInput) => {
    setSubmitError(null);
    try {
      const result = await createExpense(values);
      onSaved(result.outcome);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Could not save the expense.');
    }
  };

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      <MBHeader title="Add expense" onBack={onCancel} />
      <ScrollView
        contentContainerStyle={{ padding: theme.layout.screenPad, gap: theme.space.lg }}
        keyboardShouldPersistTaps="handled">
        <View style={styles.group}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Category</Text>
          <View style={styles.chips}>
            {EXPENSE_CATEGORIES.map(option => {
              const selected = option === category;
              return (
                <Pressable
                  key={option}
                  onPress={() => setValue('category', option, { shouldValidate: true })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      theme.type.label,
                      { color: selected ? theme.colors.onPrimary : theme.colors.text },
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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

        <View style={styles.group}>
          <Text style={[theme.type.label, { color: theme.colors.textMuted }]}>Payment method</Text>
          <View style={styles.chips}>
            {/* Only cash and easypaisa — shop expenses do not settle by card or
                bank transfer, and the server enforces the same two. */}
            {EXPENSE_PAYMENT_METHODS.map(option => {
              const selected = option === paymentMethod;
              return (
                <Pressable
                  key={option}
                  onPress={() => setValue('paymentMethod', option, { shouldValidate: true })}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  style={[
                    styles.chip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: selected ? theme.colors.primary : theme.colors.surface,
                      borderColor: selected ? theme.colors.primary : theme.colors.border,
                    },
                  ]}>
                  <Text
                    style={[
                      theme.type.label,
                      { color: selected ? theme.colors.onPrimary : theme.colors.text },
                    ]}>
                    {option}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

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

        {submitError ? (
          <Text accessibilityRole="alert" style={[theme.type.body, { color: theme.colors.danger }]}>
            {submitError}
          </Text>
        ) : null}

        <MBButton
          label="Save expense"
          onPress={handleSubmit(onSubmit)}
          loading={isSaving}
          fullWidth
          testID="save-expense"
        />
        <MBButton label="Cancel" onPress={onCancel} variant="ghost" size="md" />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  banner: { padding: 12 },
  cardTop: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  cardMain: { flex: 1, gap: 2 },
  group: { gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
