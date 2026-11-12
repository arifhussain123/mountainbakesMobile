import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * The redesign's `seg` control (Today / Week / Month, Sales / Qty): a lavender
 * track with the selected option raised as a white pill. Equal-width options.
 */
export function SegmentedControl<T extends string = string>({ options, value, onChange, style }: SegmentedControlProps<T>) {
  const theme = useAppTheme();
  const track = theme.isDark ? theme.colors.cardFill : '#E9E4FD';
  const on = theme.isDark ? theme.colors.border : theme.colors.surface;

  return (
    <View style={[styles.track, { backgroundColor: track }, style]} accessibilityRole="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.item, active && [{ backgroundColor: on }, theme.isDark ? null : styles.lift]]}>
            <Text style={[styles.text, { color: active ? theme.colors.text : theme.colors.textSecondary }]} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 16, padding: 4, gap: 4 },
  item: { flex: 1, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  lift: { shadowColor: '#171A35', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 2 },
  text: { fontSize: 13, fontWeight: '600' },
});
