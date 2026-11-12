import { SegmentedControl, type SegmentedOption } from '@/shared/ui';
import type { PaymentMethod } from '@/api';

export interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const OPTIONS: SegmentedOption<PaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'bank_account', label: 'Bank' },
];

/** Redesign `10 New Sale` — the payment method as a `seg` control (every method the sale form accepts). */
export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return <SegmentedControl options={OPTIONS} value={value} onChange={onChange} />;
}
