import { Pressable, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import type { StockSortDirection, StockSortField } from '../calculations';

export type StockSortKey = StockSortField;
export type { StockSortDirection };

export const DEFAULT_SORT_KEY: StockSortKey = 'balance';
export const DEFAULT_SORT_DIRECTION: StockSortDirection = 'desc';

interface SortOption {
  value: StockSortKey;
  label: string;
  /** Direction a product expects when first picking this field — e.g. "Balance, high to low" or "Product name, A-Z". */
  defaultDirection: StockSortDirection;
}

const OPTIONS: SortOption[] = [
  { value: 'balance', label: 'Balance', defaultDirection: 'desc' },
  { value: 'productName', label: 'Product name', defaultDirection: 'asc' },
  { value: 'stockCode', label: 'ID', defaultDirection: 'asc' },
  { value: 'opening', label: 'Opening', defaultDirection: 'desc' },
  { value: 'newQty', label: 'New', defaultDirection: 'desc' },
  { value: 'sold', label: 'Sold', defaultDirection: 'desc' },
  { value: 'returned', label: 'Returned', defaultDirection: 'desc' },
  { value: 'adjustment', label: 'Adjustment', defaultDirection: 'desc' },
];

/** The direction a field reads naturally in when first picked — e.g. Balance starts high-to-low, Product name starts A-Z. */
export function defaultDirectionFor(key: StockSortKey): StockSortDirection {
  return OPTIONS.find((option) => option.value === key)?.defaultDirection ?? 'desc';
}

export interface StockSortSheetProps {
  sortKey: StockSortKey;
  direction: StockSortDirection;
  /** Picking a field also resets direction to that field's own default (e.g. Product name starts A-Z). */
  onChangeKey: (key: StockSortKey) => void;
  onChangeDirection: (direction: StockSortDirection) => void;
}

/** Sits inside a `FormBottomSheet` — the list body only, the sheet chrome lives in the parent screen. */
export function StockSortSheet({ sortKey, direction, onChangeKey, onChangeDirection }: StockSortSheetProps) {
  const theme = useAppTheme();

  return (
    <View>
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
        {(['desc', 'asc'] as const).map((value) => {
          const active = direction === value;
          return (
            <Pressable
              key={value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => onChangeDirection(value)}
              style={[
                {
                  flex: 1,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  paddingVertical: 10,
                  borderRadius: theme.radii.md,
                  borderWidth: 1,
                  borderColor: active ? theme.colors.primary : theme.colors.cardBorder,
                  backgroundColor: active ? theme.colors.primary : theme.colors.cardFill,
                },
              ]}>
              <Icon name={value === 'desc' ? 'trending-down' : 'trending-up'} size={16} color={active ? theme.colors.primaryText : theme.colors.textSecondary} />
              <Text style={[theme.typography.body, { color: active ? theme.colors.primaryText : theme.colors.textSecondary, fontWeight: '600' }]}>
                {value === 'desc' ? 'Descending' : 'Ascending'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {OPTIONS.map((option) => {
        const active = option.value === sortKey;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChangeKey(option.value)}
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
