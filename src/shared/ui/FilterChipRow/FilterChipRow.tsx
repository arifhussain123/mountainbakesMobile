import { ScrollView, Pressable, StyleSheet, Text, View } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { PRIMARY_GRADIENT, VIOLET_CHIP_GRADIENT, midnightFill, useAppTheme } from '@/shared/theme';

export interface FilterChipOption<T extends string = string> {
  value: T;
  label: string;
  /** Optional trailing count, e.g. "Pending (4)" — omit when no count is available. */
  count?: number;
}

export interface FilterChipRowProps<T extends string = string> {
  options: FilterChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * A generic horizontally-scrolling row of single-select filter chips — status
 * filters, payment-method filters, or any other small enum. Not tied to any
 * one feature's vocabulary; callers supply their own `value`/`label` pairs.
 */
export function FilterChipRow<T extends string = string>({ options, value, onChange }: FilterChipRowProps<T>) {
  const theme = useAppTheme();
  const activeFill = midnightFill(theme);
  // Unselected chips: white with a faint lavender border (light), deep violet (dark).
  const activeInk = '#FFFFFF';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(option.value)}
            style={[
              styles.chip,
              {
                // 2026 redesign: the selected chip is a midnight pill (light) or a violet one (dark).
                backgroundColor: active ? activeFill : theme.colors.cardFill,
                borderColor: active ? activeFill : theme.colors.cardBorder,
                borderRadius: theme.radii.pill,
              },
            ]}>
            {active && theme.isDark ? (
              <LinearGradient
                pointerEvents="none"
                colors={[...VIOLET_CHIP_GRADIENT]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[StyleSheet.absoluteFill, { borderRadius: theme.radii.pill }]}
              />
            ) : null}
            <Text style={[styles.label, { color: active ? activeInk : theme.colors.textSecondary }]}>{option.label}</Text>
            {option.count !== undefined ? <CountBubble count={option.count} active={active} /> : null}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

/** The chip's count: an orange gradient bubble on the selected chip, a lavender one otherwise. */
function CountBubble({ count, active }: { count: number; active: boolean }) {
  const theme = useAppTheme();
  const text = <Text style={[styles.n, { color: active ? '#FFFFFF' : theme.colors.textSecondary }]}>{count}</Text>;
  if (active) {
    return (
      <LinearGradient colors={[...PRIMARY_GRADIENT]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.bubble}>
        {text}
      </LinearGradient>
    );
  }
  const fill = theme.isDark ? theme.colors.border : '#EEF0F8';
  return <View style={[styles.bubble, { backgroundColor: fill }]}>{text}</View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: { height: 36, paddingHorizontal: 14, borderWidth: 1, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  label: { fontSize: 13, fontWeight: '600' },
  bubble: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 9 },
  n: { fontSize: 11, fontWeight: '600' },
});
