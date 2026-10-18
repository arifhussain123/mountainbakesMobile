import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  actionPills: { flexDirection: 'row', gap: 6 },
  pill: { height: 34, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  twoCol: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, borderRadius: 16, borderWidth: 1, padding: 12 },
  statHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  labelValueRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1 },
  dot: { width: 9, height: 9, borderRadius: 2 },
});
