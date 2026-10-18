import { forwardRef } from 'react';
import { Pressable, Text } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon } from '@/shared/ui';

export type DiscountSortField = 'date' | 'reviewedAt' | 'demandNumber' | 'amount' | 'reason' | 'status';

export const DISCOUNT_SORT_OPTIONS: { field: DiscountSortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'reviewedAt', label: 'Reviewed' },
  { field: 'demandNumber', label: 'Demand #' },
  { field: 'amount', label: 'Amount' },
  { field: 'reason', label: 'Reason' },
  { field: 'status', label: 'Status' },
];

export interface SortSheetProps {
  value: DiscountSortField;
  onChange: (field: DiscountSortField) => void;
  onRequestClose: () => void;
}

/** The Discounts list's "Sort" sheet — Date/Reviewed/Demand #/Amount/Reason/Status, default Date desc. */
export const SortSheet = forwardRef<BottomSheetModal, SortSheetProps>(({ value, onChange, onRequestClose }, ref) => {
  const theme = useAppTheme();

  return (
    <FormBottomSheet ref={ref} title="Sort By" onRequestClose={onRequestClose} snapPoints={['50%']}>
      {DISCOUNT_SORT_OPTIONS.map((option) => {
        const active = option.field === value;
        return (
          <Pressable
            key={option.field}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            onPress={() => {
              onChange(option.field);
              onRequestClose();
            }}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingVertical: 14,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}>
            <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: active ? '700' : '400' }]}>{option.label}</Text>
            {active ? <Icon name="check" size={16} color={theme.colors.primary} /> : null}
          </Pressable>
        );
      })}
    </FormBottomSheet>
  );
});
