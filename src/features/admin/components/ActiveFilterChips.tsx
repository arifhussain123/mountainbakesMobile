import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';
import { showClearAll, type FilterChip } from '../utils/listControls';

export interface ActiveFilterChipsProps {
  /** Only the filters that are on — build the list with `activeChips()`. */
  chips: readonly FilterChip[];
  /** Puts every filter (and the search) back to its default. */
  onClearAll: () => void;
}

/**
 * The web's `ActiveFilters` row: each filter that is on, as a chip with its
 * own ×, and — once there are two or more — the Clear button that takes them
 * all off. Nothing renders while no filter is on.
 */
export function ActiveFilterChips({ chips, onClearAll }: ActiveFilterChipsProps) {
  const theme = useAppTheme();
  if (chips.length === 0) return null;
  return (
    <View style={styles.row} accessibilityLabel="Active filters">
      {chips.map((chip) => (
        <View
          key={chip.key}
          style={[styles.chip, { backgroundColor: theme.colors.cardFill, borderColor: theme.colors.cardBorder, borderRadius: theme.radii.pill }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text, flexShrink: 1 }]} numberOfLines={1}>
            {chip.label}
          </Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`Remove filter ${chip.label}`} onPress={chip.onRemove} hitSlop={8} style={styles.x}>
            <Icon name="close" size={11} color={theme.colors.textSecondary} />
          </Pressable>
        </View>
      ))}
      {showClearAll(chips.length) ? (
        <Pressable accessibilityRole="button" accessibilityLabel="Clear all filters" onPress={onClearAll} style={styles.clear} hitSlop={4}>
          <Icon name="close" size={12} color={theme.colors.primary} />
          <Text style={[theme.typography.label, { color: theme.colors.primary, fontWeight: '700' }]}>Clear</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, paddingLeft: 10, paddingRight: 6, minHeight: 30, maxWidth: '100%' },
  x: { padding: 3 },
  clear: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 30, paddingHorizontal: 6 },
});
