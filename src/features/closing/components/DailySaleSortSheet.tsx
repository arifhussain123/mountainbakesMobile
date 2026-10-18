import { forwardRef } from 'react';
import { Pressable, Text } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon } from '@/shared/ui';

export type DailySaleSortField = 'date' | 'totalSale' | 'difference' | 'status';

/** Each field's natural sort direction — newest date, largest sale/difference, and status grouped open-first. */
export const DAILY_SALE_SORT_DIRECTION: Record<DailySaleSortField, 'asc' | 'desc'> = {
  date: 'desc',
  totalSale: 'desc',
  difference: 'desc',
  status: 'asc',
};

export const DAILY_SALE_SORT_OPTIONS: { field: DailySaleSortField; label: string }[] = [
  { field: 'date', label: 'Date' },
  { field: 'totalSale', label: 'Total Sale' },
  { field: 'difference', label: 'Difference' },
  { field: 'status', label: 'Status' },
];

export interface DailySaleSortSheetProps {
  value: DailySaleSortField;
  onChange: (field: DailySaleSortField) => void;
  onRequestClose: () => void;
}

/** The Daily Sale Record list's "Sort" sheet — Date (default)/Total Sale/Difference/Status, client-side (no server sort param for this list). */
export const DailySaleSortSheet = forwardRef<BottomSheetModal, DailySaleSortSheetProps>(({ value, onChange, onRequestClose }, ref) => {
  const theme = useAppTheme();

  return (
    <FormBottomSheet ref={ref} title="Sort By" onRequestClose={onRequestClose} snapPoints={['45%']}>
      {DAILY_SALE_SORT_OPTIONS.map((option) => {
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
