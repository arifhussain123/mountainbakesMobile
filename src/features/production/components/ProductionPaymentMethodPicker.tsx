import { Dropdown, type DropdownOption } from '@/shared/ui';
import type { ProductionSalePaymentMethod } from '@/api';

export interface ProductionPaymentMethodPickerProps {
  value: ProductionSalePaymentMethod;
  onChange: (method: ProductionSalePaymentMethod) => void;
}

const OPTIONS: DropdownOption<ProductionSalePaymentMethod>[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'easypaisa', label: 'Easypaisa' },
  { value: 'foodpanda', label: 'Foodpanda' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'staff', label: 'Staff (No Charge)' },
];

/** Adds 'staff' to the Branch app's own PaymentMethodPicker options — Production-only. */
export function ProductionPaymentMethodPicker({ value, onChange }: ProductionPaymentMethodPickerProps) {
  return <Dropdown options={OPTIONS} value={value} onChange={onChange} placeholder="Select a payment method" />;
}
