import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  body: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28, gap: 12 },
  grow: { flex: 1, minWidth: 0 },
  hero: { gap: 10 },
  miniRow: { flexDirection: 'row', gap: 10, marginTop: 2 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 4 },
  details: { paddingVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingVertical: 12 },
  rowValue: { flexShrink: 1, textAlign: 'right' },
  reviewTitle: { fontSize: 14, fontWeight: '600' },
  finalRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  photoFrame: { height: 220, borderWidth: 1, borderRadius: 22, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
