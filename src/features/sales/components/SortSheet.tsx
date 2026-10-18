import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { FormBottomSheet } from '@/shared/ui';

export type SortField = 'createdAt' | 'orderNumber' | 'customerName' | 'grandTotal' | 'notes';

export const SORT_OPTIONS: { field: SortField; label: string }[] = [
  { field: 'createdAt', label: 'Time' },
  { field: 'orderNumber', label: 'ID' },
  { field: 'customerName', label: 'Customer' },
  { field: 'grandTotal', label: 'Amount' },
  { field: 'notes', label: 'Comment' },
];

export interface SortSheetProps {
  value: SortField;
  onChange: (field: SortField) => void;
  onRequestClose: () => void;
}

/** The Sales list's "Sort" bottom sheet — Time/ID/Customer/Amount/Comment, default Time (desc). */
export const SortSheet = forwardRef<BottomSheetModal, SortSheetProps>(({ value, onChange, onRequestClose }, ref) => {
  const theme = useAppTheme();

  return (
    <FormBottomSheet ref={ref} title="Sort By" onRequestClose={onRequestClose} snapPoints={['45%']}>
      {SORT_OPTIONS.map((option) => {
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
      <View style={{ marginTop: theme.spacing.sm }}>
        <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>Most recent first.</Text>
      </View>
    </FormBottomSheet>
  );
});
