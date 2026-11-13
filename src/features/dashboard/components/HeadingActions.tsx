import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { midnightFill, useAppTheme } from '@/shared/theme';

export interface HeadingActionsProps {
  compareActive: boolean;
  onToggleCompare: () => void;
  onExport: () => void;
  exporting?: boolean;
}

/**
 * The "Compare" / "Export" pair beside the Sales-analytics heading. Compare is
 * a toggle chip (navy when on, like the redesign's selected `chip`); Export is
 * a one-shot action with its own loading state.
 */
export function HeadingActions({ compareActive, onToggleCompare, onExport, exporting }: HeadingActionsProps) {
  const theme = useAppTheme();
  const idleBg = theme.isDark ? theme.colors.cardFill : theme.colors.surface;
  const onBg = theme.isDark ? midnightFill(theme) : '#2E2A5C';
  const onInk = '#FFFFFF';

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare with the previous period"
        accessibilityState={{ selected: compareActive }}
        onPress={onToggleCompare}
        style={[styles.chip, compareActive ? { backgroundColor: onBg, borderColor: onBg } : { backgroundColor: idleBg, borderColor: theme.colors.border }]}>
        <Text style={[styles.text, { color: compareActive ? onInk : theme.colors.text }]}>Compare</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export sales data"
        disabled={exporting}
        onPress={onExport}
        style={[styles.chip, { backgroundColor: idleBg, borderColor: theme.colors.border, opacity: exporting ? 0.6 : 1 }]}>
        {exporting ? <ActivityIndicator size="small" color={theme.colors.text} /> : <Text style={[styles.text, { color: theme.colors.text }]}>Export</Text>}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  chip: { height: 32, minWidth: 64, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 13, fontWeight: '600' },
});
