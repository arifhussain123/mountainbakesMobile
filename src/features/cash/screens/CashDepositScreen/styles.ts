import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  block: { marginBottom: 12 },
  hint: { marginBottom: 4 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  fieldsRow: { flexDirection: 'row', gap: 8 },
  cell: { flex: 1, minWidth: 0 },
  cellWide: { flex: 1.4, minWidth: 0 },
  totalCard: { marginTop: 16, borderRadius: 22, borderWidth: 1, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  totalText: { gap: 2 },
  totalValue: { flexShrink: 1, fontSize: 22, fontWeight: '600', letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  help: { fontSize: 12, lineHeight: 17, marginTop: 6 },
  label: { fontSize: 14, fontWeight: '600', marginTop: 16, marginBottom: 8 },
  photoBox: { height: 96, borderRadius: 16, borderWidth: 1.5, borderStyle: 'dashed', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  photoPreview: { height: 120, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 20 },
});
