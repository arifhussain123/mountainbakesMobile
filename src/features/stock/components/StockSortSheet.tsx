import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export type StockSortKey = 'balance' | 'productName' | 'stockCode' | 'opening' | 'newQty' | 'sold' | 'returned' | 'adjustment';

const OPTIONS: { value: StockSortKey; label: string }[] = [
  { value: 'balance', label: 'Balance' },
  { value: 'productName', label: 'Product' },
  { value: 'stockCode', label: 'ID' },
  { value: 'opening', label: 'Opening' },
  { value: 'newQty', label: 'New' },
  { value: 'sold', label: 'Sold' },
  { value: 'returned', label: 'Returned' },
  { value: 'adjustment', label: 'Adjustment' },
];

export interface StockSortSheetProps {
  value: StockSortKey;
  onChange: (key: StockSortKey) => void;
}

/** Sits inside a `FormBottomSheet` — the list body only, the sheet chrome lives in the parent screen. */
export function StockSortSheet({ value, onChange }: StockSortSheetProps) {
  const theme = useAppTheme();

  return (
    <View>
      {OPTIONS.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={[theme.typography.body, { color: active ? theme.colors.primary : theme.colors.text, fontWeight: active ? '700' : '400' }]}>
              {option.label}
            </Text>
            {active ? <Icon name="check" size={18} color={theme.colors.primary} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}
