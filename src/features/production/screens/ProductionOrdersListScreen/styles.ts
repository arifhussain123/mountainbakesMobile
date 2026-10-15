import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  tabsRow: { flexDirection: 'row', gap: 4, padding: 4, marginTop: 12 },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  demandHeaderRow: { flexDirection: 'row', gap: 6, marginTop: 12, paddingBottom: 7, borderBottomWidth: 1 },
  demandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 9, borderBottomWidth: 1 },
  demandToggle: { marginTop: 8, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
