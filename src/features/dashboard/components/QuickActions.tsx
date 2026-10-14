import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { Routes, navigate, openComingSoon } from '@/navigation';

const SECONDARY_ACTIONS = ['Stock', 'Demand', 'Expense', 'Return'] as const;

/** CLAUDE.md Section 17 — New Sale is the one visually prominent action. */
export function QuickActions() {
  const theme = useAppTheme();

  const handleSecondary = (label: (typeof SECONDARY_ACTIONS)[number]) => {
    if (label === 'Stock') {
      navigate(Routes.DRAWER, { screen: Routes.TABS, params: { screen: Routes.STOCK_TAB } });
      return;
    }
    openComingSoon(label);
  };

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        onPress={() => navigate(Routes.DRAWER, { screen: Routes.TABS, params: { screen: Routes.SALES_TAB, params: { screen: Routes.NEW_SALE } } })}
        style={[styles.primary, { backgroundColor: theme.colors.primary, borderRadius: theme.radii.md }]}>
        <Text style={[theme.typography.cardTitle, { color: theme.colors.primaryText }]}>+ New Sale</Text>
      </Pressable>
      {SECONDARY_ACTIONS.map((label) => (
        <Pressable
          key={label}
          accessibilityRole="button"
          onPress={() => handleSecondary(label)}
          style={[styles.secondary, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
          <Text style={[theme.typography.label, { color: theme.colors.text }]}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primary: { flexBasis: '100%', height: 52, alignItems: 'center', justifyContent: 'center' },
  secondary: { flexGrow: 1, height: 44, minWidth: 72, alignItems: 'center', justifyContent: 'center', borderWidth: 1, paddingHorizontal: 10 },
});
