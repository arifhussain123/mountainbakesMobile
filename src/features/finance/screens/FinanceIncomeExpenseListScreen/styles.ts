import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  chip: { height: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  typeToggle: { flex: 1, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  staticField: { height: 46, borderWidth: 1, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14 },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  photoPreview: { height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  actionsRow: { flexDirection: 'row', gap: 8, marginTop: 16 },
});
