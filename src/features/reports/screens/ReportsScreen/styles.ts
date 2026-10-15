import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { flexDirection: 'row', gap: 4, padding: 4 },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
});
