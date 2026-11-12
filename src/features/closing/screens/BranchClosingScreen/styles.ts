import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  iconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  iconLift: { shadowColor: '#4C3CAA', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.12, shadowRadius: 12, elevation: 3 },
  listCard: { paddingVertical: 4 },
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  liTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'] },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, paddingVertical: 10 },
  expenseRow: { paddingVertical: 12 },
  sm: { fontSize: 13, lineHeight: 18 },
  strong: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  pullUp: { marginTop: -8 },
});
