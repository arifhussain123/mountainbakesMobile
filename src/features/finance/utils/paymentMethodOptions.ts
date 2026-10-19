import { FINANCE_PAYMENT_METHODS, FINANCE_PAYMENT_METHOD_LABELS, type FinancePaymentMethod } from '@/api';
import type { DropdownOption } from '@/shared/ui';

/** Payment Method dropdown options shared by every finance form sheet. */
export const FINANCE_PAYMENT_METHOD_OPTIONS: DropdownOption<FinancePaymentMethod>[] = FINANCE_PAYMENT_METHODS.map((m) => ({
  value: m,
  label: FINANCE_PAYMENT_METHOD_LABELS[m],
}));
