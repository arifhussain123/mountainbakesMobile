import { useRef, useState } from 'react';
import { EXPENSE_CATEGORIES, generateIdempotencyKey, useCreateExpense } from '@/api';
import { mapErrorToMessage } from '@/shared/helpers';
import type { ExpensePaymentMethod } from '@/api';

/** branchApp.md screen 17 — New Shop Expense. Today-only date, cash/easypaisa only. */
export function useNewExpenseForm() {
  const createExpense = useCreateExpense();

  const [category, setCategory] = useState<string>(EXPENSE_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>('cash');
  const [remarks, setRemarks] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);

  const idempotencyKeyRef = useRef(generateIdempotencyKey('expense'));

  const amount = parseFloat(amountInput) || 0;
  const canSubmit = description.trim().length > 0 && amount > 0 && !createExpense.isPending;

  const submit = async (): Promise<boolean> => {
    if (!canSubmit) return false;
    setSubmitError(null);
    try {
      await createExpense.mutateAsync({
        input: { category, description: description.trim(), paymentMethod, amount, remarks: remarks.trim() || undefined },
        idempotencyKey: idempotencyKeyRef.current,
      });
      return true;
    } catch (error) {
      setSubmitError(mapErrorToMessage(error));
      return false;
    }
  };

  return {
    categories: EXPENSE_CATEGORIES,
    category,
    setCategory,
    description,
    setDescription,
    amountInput,
    setAmountInput,
    paymentMethod,
    setPaymentMethod,
    remarks,
    setRemarks,
    canSubmit,
    isSubmitting: createExpense.isPending,
    submitError,
    submit,
  };
}
