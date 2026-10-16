import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface HeadingActionsProps {
  compareActive: boolean;
  onToggleCompare: () => void;
  onExport: () => void;
  exporting?: boolean;
}

/**
 * Design line 132 — the "Compare"/"Export" pill pair next to the "Daily Sales"
 * heading. Compare is a filled toggle (on/off); Export is outlined and always
 * a one-shot action, so it gets its own loading state instead of a toggle look.
 */
export function HeadingActions({ compareActive, onToggleCompare, onExport, exporting }: HeadingActionsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Compare with the previous period"
        accessibilityState={{ selected: compareActive }}
        onPress={onToggleCompare}
        style={[
          styles.pill,
          {
            backgroundColor: compareActive ? theme.colors.primary : theme.colors.cardFill,
          },
        ]}>
        <Text style={[theme.typography.label, { color: compareActive ? theme.colors.primaryText : theme.colors.text, fontWeight: '700' }]}>
          Compare
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Export sales data"
        disabled={exporting}
        onPress={onExport}
        style={[styles.pill, styles.outlined, { borderColor: theme.colors.cardBorder, opacity: exporting ? 0.6 : 1 }]}>
        {exporting ? (
          <ActivityIndicator size="small" color={theme.colors.text} />
        ) : (
          <Text style={[theme.typography.label, { color: theme.colors.text, fontWeight: '700' }]}>Export</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  pill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, minHeight: 32, alignItems: 'center', justifyContent: 'center' },
  outlined: { borderWidth: 1, backgroundColor: 'transparent' },
});
