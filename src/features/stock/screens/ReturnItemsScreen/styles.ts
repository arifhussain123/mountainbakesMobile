import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  reasonInput: { minHeight: 76, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  photoPreview: { height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  footer: { borderTopWidth: 1, padding: 16, paddingBottom: 24 },
  footerStatsRow: { flexDirection: 'row', gap: 16 },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
