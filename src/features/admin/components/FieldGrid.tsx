import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';

/** Monospace for codes and SKUs, as the web renders them (`font-mono`). */
export const MONO_FONT = Platform.select({ ios: 'Menlo', default: 'monospace' });

export interface FieldGridItem {
  label: string;
  /** Text, or a node (a badge) when the web cell is more than a string. */
  value: ReactNode;
  valueStyle?: TextStyle;
}

/**
 * A web table row's remaining columns as a label-over-value grid inside a card
 * (`grid-cols-3` on the web's own mobile cards).
 */
export function FieldGrid({ items, columns = 3 }: { items: FieldGridItem[]; columns?: 2 | 3 }) {
  const theme = useAppTheme();
  const basis = columns === 3 ? '30%' : '45%';
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <View key={item.label} style={{ flexGrow: 1, flexBasis: basis, minWidth: 0 }}>
          <Text style={[theme.typography.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {item.label}
          </Text>
          {typeof item.value === 'string' || typeof item.value === 'number' ? (
            <Text style={[theme.typography.bodySmall, { color: theme.colors.text, marginTop: 2 }, item.valueStyle]} numberOfLines={2}>
              {item.value}
            </Text>
          ) : (
            <View style={{ marginTop: 2, alignItems: 'flex-start' }}>{item.value}</View>
          )}
        </View>
      ))}
    </View>
  );
}

/** One "label … value" line of a read-only detail list (the web's `<dl>` rows). */
export function DetailRow({ label, value, mono, block }: { label: string; value: string; mono?: boolean; block?: boolean }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        block ? styles.detailBlock : styles.detailRow,
        { borderBottomColor: theme.colors.border, paddingVertical: theme.spacing.sm },
      ]}>
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text
        style={[
          theme.typography.bodySmall,
          { color: theme.colors.text, flexShrink: 1, textAlign: block ? 'left' : 'right', marginTop: block ? 4 : 0 },
          mono ? { fontFamily: MONO_FONT } : null,
        ]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  detailBlock: { borderBottomWidth: StyleSheet.hairlineWidth },
});
