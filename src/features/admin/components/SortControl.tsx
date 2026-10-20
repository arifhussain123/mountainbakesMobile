import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { defaultSortDir, sortDirLabel, sortSummary, type SortDir, type SortField, type SortState } from '../utils/listControls';

export interface SortControlProps<T> {
  /** The web table's sortable columns, in its column order. */
  fields: readonly SortField<T>[];
  value: SortState | null;
  onChange: (next: SortState | null) => void;
  /** What the list is in before anything is picked ("Newest first"). */
  defaultLabel?: string;
}

/**
 * The web table's sortable headers, as one control: tap to open, pick the
 * column, then the direction. One key at a time, as the web table sorts.
 * "Default order" puts the list back the way the server (or page) orders it
 * — the web's third click on a header. Opens inline (not a sheet) so it also
 * works inside a list header.
 */
export function SortControl<T>({ fields, value, onChange, defaultLabel = 'Default order' }: SortControlProps<T>) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  const active = !!value;
  const field = value ? fields.find((f) => f.key === value.key) : undefined;

  const pickField = (f: SortField<T>) => onChange({ key: f.key, dir: value?.key === f.key ? value.dir : defaultSortDir(f.kind) });
  const pickDir = (dir: SortDir) => value && onChange({ key: value.key, dir });

  const pill = (selected: boolean) => [
    styles.pill,
    {
      borderRadius: theme.radii.pill,
      borderColor: selected ? theme.colors.primary : theme.colors.cardBorder,
      backgroundColor: selected ? theme.colors.primary : theme.colors.cardFill,
    },
  ];
  const pillText = (selected: boolean) => [theme.typography.label, { color: selected ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' as const }];

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Sort: ${sortSummary(value, fields, defaultLabel)}`}
        onPress={() => setOpen((o) => !o)}
        style={[
          styles.trigger,
          { borderRadius: theme.radii.md, borderColor: active || open ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.surface },
        ]}>
        <Icon name="sort" size={15} color={active ? theme.colors.primary : theme.colors.textSecondary} />
        <Text style={[theme.typography.bodySmall, { color: theme.colors.text, flex: 1 }]} numberOfLines={1}>
          <Text style={{ color: theme.colors.textSecondary }}>Sort: </Text>
          {sortSummary(value, fields, defaultLabel)}
        </Text>
        <Icon name={open ? 'chevron-down' : 'chevron-right'} size={15} color={theme.colors.textSecondary} />
      </Pressable>
      {open ? (
        <View style={[styles.panel, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface, borderRadius: theme.radii.md }]}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]}>Sort by</Text>
          <View style={styles.wrap}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: !active }} onPress={() => onChange(null)} style={pill(!active)}>
              <Text style={pillText(!active)}>{defaultLabel}</Text>
            </Pressable>
            {fields.map((f) => {
              const selected = value?.key === f.key;
              return (
                <Pressable key={f.key} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => pickField(f)} style={pill(selected)}>
                  <Text style={pillText(selected)}>{f.label}</Text>
                </Pressable>
              );
            })}
          </View>
          {field ? (
            <>
              <Text style={[theme.typography.label, { color: theme.colors.textSecondary, marginTop: 4 }]}>Order</Text>
              <View style={styles.wrap}>
                {(['asc', 'desc'] as const).map((dir) => {
                  const selected = value?.dir === dir;
                  return (
                    <Pressable
                      key={dir}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      accessibilityLabel={`${field.label}, ${sortDirLabel(field.kind, dir)}`}
                      onPress={() => pickDir(dir)}
                      style={pill(selected)}>
                      <Text style={pillText(selected)}>
                        {dir === 'asc' ? '↑ ' : '↓ '}
                        {sortDirLabel(field.kind, dir)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: { height: 44, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  panel: { marginTop: 6, borderWidth: 1, padding: 10, gap: 6 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { minHeight: 32, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
