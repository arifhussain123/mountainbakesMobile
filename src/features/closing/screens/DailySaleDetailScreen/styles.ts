import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 16 },
  listCard: { paddingVertical: 4 },
  pad: { paddingVertical: 12 },
  li: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 12 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  liTitle: { fontSize: 15, lineHeight: 20, fontWeight: '600', letterSpacing: -0.2 },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
  sm: { fontSize: 13, lineHeight: 18 },
  amt: { fontSize: 16, fontWeight: '700', letterSpacing: -0.2, fontVariant: ['tabular-nums'], marginTop: 2 },
  hint: { marginTop: 8 },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14 },
  linkText: { fontSize: 14, fontWeight: '600' },
  pullUp: { marginTop: -8 },
});
