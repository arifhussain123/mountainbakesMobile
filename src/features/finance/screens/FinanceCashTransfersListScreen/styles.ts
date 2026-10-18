import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 4, padding: 4 },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
