import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  tabsRow: { flexDirection: 'row', gap: 4, padding: 4, marginTop: 8 },
  tab: { flex: 1, height: 36, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, marginBottom: 8 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  typeToggle: { flex: 1, height: 44, borderWidth: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  input: { height: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, fontSize: 14 },
  staticField: { height: 46, borderWidth: 1, borderRadius: 12, justifyContent: 'center', paddingHorizontal: 14 },
  photoRow: { flexDirection: 'row', gap: 8 },
  photoButton: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8 },
  photoPreview: { height: 120, borderRadius: 14, overflow: 'hidden', position: 'relative' },
  photoImage: { width: '100%', height: '100%' },
  photoRemove: { position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
