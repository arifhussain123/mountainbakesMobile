import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  headerTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  exportRow: { flexDirection: 'row', gap: 6 },
  exportPill: { height: 34, paddingHorizontal: 10, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  printPill: { height: 34, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  eyebrow: { textTransform: 'uppercase', letterSpacing: 1 },
  bigTitle: { textTransform: 'uppercase' },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  periodToggleWrap: { width: 176 },
  kpiGrid: { flexDirection: 'row', gap: 8 },
  kpiCard: { flex: 1, borderWidth: 1, minWidth: 0 },
  kpiCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tabsRow: { flexDirection: 'row', gap: 6 },
  tab: { flexShrink: 0, height: 34, paddingHorizontal: 14, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  packingPlaceholder: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', paddingVertical: 28, paddingHorizontal: 16 },
});
