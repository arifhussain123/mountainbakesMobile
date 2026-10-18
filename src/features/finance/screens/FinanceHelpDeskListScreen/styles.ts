import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  statTile: { width: '31%', borderRadius: 16, borderWidth: 1, padding: 10 },
  tabsRow: { flexDirection: 'row', gap: 4, padding: 3, borderRadius: 12 },
  tab: { height: 30, paddingHorizontal: 12, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  typeToggle: { height: 36, paddingHorizontal: 14, borderWidth: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8 },
});
