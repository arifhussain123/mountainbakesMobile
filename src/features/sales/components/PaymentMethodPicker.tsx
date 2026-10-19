import { Dropdown, type DropdownOption } from '@/shared/ui';
import type { PaymentMethod } from '@/api';

export interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const OPTIONS: DropdownOption<PaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'bank_account', label: 'Bank Account' },
];

export function PaymentMethodPicker({ value, onChange }: PaymentMethodPickerProps) {
  return <Dropdown options={OPTIONS} value={value} onChange={onChange} placeholder="Select a payment method" />;
}
