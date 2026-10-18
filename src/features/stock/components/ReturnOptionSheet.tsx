import { forwardRef, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { FormBottomSheet, Icon, SearchBar } from '@/shared/ui';
import { includesTerm } from '@/shared/utils';

export interface ReturnOption {
  value: string;
  label: string;
  /** Second line, e.g. a product code. */
  hint?: string;
}

export interface ReturnOptionSheetProps {
  title: string;
  options: ReturnOption[];
  value: string;
  onChange: (value: string) => void;
  onRequestClose: () => void;
  /** Adds a search box over the labels — the product list is long enough to need one. */
  searchable?: boolean;
  snapPoints?: string[];
}

/**
 * Return Stock's pick-one sheets — Sort, the window ("Last · 90 days") and
 * Product. Same row pattern as the Daily Sale Record's Sort sheet: tap a row,
 * it is applied and the sheet closes.
 */
export const ReturnOptionSheet = forwardRef<BottomSheetModal, ReturnOptionSheetProps>(
  ({ title, options, value, onChange, onRequestClose, searchable = false, snapPoints = ['55%'] }, ref) => {
    const theme = useAppTheme();
    const [search, setSearch] = useState('');
    const shown = useMemo(() => {
      const term = search.trim().toLowerCase();
      if (!term) return options;
      return options.filter((o) => includesTerm(o.label, term) || includesTerm(o.hint, term));
    }, [options, search]);

    return (
      <FormBottomSheet ref={ref} title={title} onRequestClose={onRequestClose} onDismiss={() => setSearch('')} snapPoints={snapPoints}>
        {searchable ? <SearchBar value={search} onChangeText={setSearch} placeholder="Search…" /> : null}
        {shown.map((option) => {
          const active = option.value === value;
          return (
            <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: active }}
              onPress={() => {
                onChange(option.value);
                onRequestClose();
              }}
              style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <Text style={[theme.typography.body, styles.label, { color: theme.colors.text, fontWeight: active ? '700' : '400' }]} numberOfLines={1}>
                {option.label}
                {option.hint ? <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{`  ${option.hint}`}</Text> : null}
              </Text>
              {active ? <Icon name="check" size={16} color={theme.colors.primary} /> : null}
            </Pressable>
          );
        })}
        {shown.length === 0 ? <Text style={[theme.typography.body, styles.empty, { color: theme.colors.textSecondary }]}>No matches.</Text> : null}
      </FormBottomSheet>
    );
  },
);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  label: { flex: 1 },
  empty: { paddingVertical: 16, textAlign: 'center' },
});
