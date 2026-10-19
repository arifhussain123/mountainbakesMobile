import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

const styles = StyleSheet.create({
  field: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  list: { marginTop: 6, borderWidth: 1, borderRadius: 12, padding: 8 },
});

/** Options above this count get a search box. */
const SEARCH_THRESHOLD = 8;

export interface FinanceDropdownOption {
  value: string;
  label: string;
  /** Short tag shown on the right of the closed field, e.g. a head code. */
  hint?: string;
  /** Second line in the open list. */
  sublabel?: string;
}

export interface FinanceDropdownProps {
  options: FinanceDropdownOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder: string;
  loading?: boolean;
  emptyLabel?: string;
}

/** An inline dropdown (not a nested sheet — @gorhom/bottom-sheet nesting is awkward) for picking one option inside a finance form sheet. */
export function FinanceDropdown({ options, value, onChange, placeholder, loading, emptyLabel }: FinanceDropdownProps) {
  const theme = useAppTheme();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value) ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return options;
    return options.filter((o) => o.label.toLowerCase().includes(term) || (o.hint ?? '').toLowerCase().includes(term));
  }, [options, search]);

  const closedLabel = loading ? 'Loading…' : options.length === 0 && emptyLabel ? emptyLabel : placeholder;

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        disabled={options.length === 0}
        onPress={() => setOpen((o) => !o)}
        style={[styles.field, { borderColor: open ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <Text style={[theme.typography.body, { flex: 1, color: selected ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
          {selected ? selected.label : closedLabel}
        </Text>
        {selected?.hint ? <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>{selected.hint}</Text> : null}
        <Icon name="chevron-down" size={16} color={theme.colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={[styles.list, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          {options.length > SEARCH_THRESHOLD ? (
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search…"
              placeholderTextColor={theme.colors.textSecondary}
              style={[styles.input, { borderColor: theme.colors.border, color: theme.colors.text, marginBottom: 4 }]}
            />
          ) : null}
          <ScrollView style={{ maxHeight: 240 }} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {filtered.map((option, i) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    onChange(option.value);
                    setOpen(false);
                    setSearch('');
                  }}
                  style={{
                    paddingVertical: 10,
                    paddingHorizontal: 6,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 8,
                    borderTopWidth: i === 0 ? 0 : 1,
                    borderTopColor: theme.colors.border,
                  }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[theme.typography.body, { color: active ? theme.colors.primary : theme.colors.text, fontWeight: '600' }]} numberOfLines={1}>
                      {option.label}
                    </Text>
                    {option.sublabel ? (
                      <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                        {option.sublabel}
                      </Text>
                    ) : null}
                  </View>
                  {active ? <Icon name="check" size={16} color={theme.colors.primary} /> : null}
                </Pressable>
              );
            })}
            {filtered.length === 0 ? (
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, paddingVertical: 10 }]}>No matches.</Text>
            ) : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}
