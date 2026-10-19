import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { PriceChangeSource } from '@/api';
import { useAppTheme } from '@/shared/theme';
import { Dropdown, FilterChipRow, Icon, SearchBar, type DropdownOption, type FilterChipOption } from '@/shared/ui';
import { formatDisplayDate, type DateRange } from '@/shared/utils';
import { PRICE_SOURCE_LABEL } from '../utils/priceHistoryHints';

export type DirectionFilter = 'all' | 'up' | 'down';
export type SourceFilter = 'all' | PriceChangeSource;

const DIRECTION_OPTIONS: FilterChipOption<DirectionFilter>[] = [
  { value: 'all', label: 'All changes' },
  { value: 'up', label: 'Increases' },
  { value: 'down', label: 'Decreases' },
];

const SOURCE_OPTIONS: FilterChipOption<SourceFilter>[] = [
  { value: 'all', label: 'All sources' },
  { value: 'manual', label: PRICE_SOURCE_LABEL.manual },
  { value: 'import', label: PRICE_SOURCE_LABEL.import },
];

/** Dropdown value for "no filter" — never shown; the option's label is. */
export const ALL = 'all';

export interface PriceHistoryFiltersProps {
  search: string;
  onSearch: (v: string) => void;
  productOptions: DropdownOption[];
  productId: string;
  onProduct: (id: string) => void;
  changedByOptions: DropdownOption[];
  changedBy: string;
  onChangedBy: (name: string) => void;
  direction: DirectionFilter;
  onDirection: (v: DirectionFilter) => void;
  source: SourceFilter;
  onSource: (v: SourceFilter) => void;
  dateRange: DateRange | null;
  onOpenDates: () => void;
  onClearDates: () => void;
  hasActiveFilters: boolean;
  onClearAll: () => void;
}

function rangeLabel(r: DateRange): string {
  return r.from === r.to ? formatDisplayDate(r.from) : `${formatDisplayDate(r.from)} – ${formatDisplayDate(r.to)}`;
}

/** Search, product, effective-date window, who changed it, direction and source. */
export function PriceHistoryFilters(p: PriceHistoryFiltersProps) {
  const theme = useAppTheme();
  const pill = [styles.pill, { borderColor: theme.colors.cardBorder, backgroundColor: theme.colors.cardFill, borderRadius: theme.radii.pill }];

  return (
    <View style={{ gap: 8 }}>
      <SearchBar value={p.search} onChangeText={p.onSearch} placeholder="Product, code, PRC no. or reason…" />
      <Dropdown options={p.productOptions} value={p.productId} onChange={p.onProduct} />
      <Dropdown options={p.changedByOptions} value={p.changedBy} onChange={p.onChangedBy} />
      <View style={styles.row}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={p.dateRange ? `Effective dates ${rangeLabel(p.dateRange)}. Change` : 'Filter by effective date'}
          onPress={p.onOpenDates}
          style={pill}>
          <Icon name="calendar" size={12} color={theme.colors.textSecondary} />
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700', flexShrink: 1 }]} numberOfLines={1}>
            {p.dateRange ? `Effective ${rangeLabel(p.dateRange)}` : 'Any effective date'}
          </Text>
        </Pressable>
        {p.dateRange ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear the date filter" onPress={p.onClearDates} style={pill}>
            <Icon name="close" size={12} color={theme.colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>
      <FilterChipRow options={DIRECTION_OPTIONS} value={p.direction} onChange={p.onDirection} />
      <FilterChipRow options={SOURCE_OPTIONS} value={p.source} onChange={p.onSource} />
      {p.hasActiveFilters ? (
        <Pressable accessibilityRole="button" onPress={p.onClearAll} style={styles.clear}>
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Clear all filters</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { minHeight: 36, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6 },
  clear: { alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' },
});
