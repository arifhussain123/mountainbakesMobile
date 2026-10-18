import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center' },
  timeline: { marginTop: 16 },
  timelineStep: { flexDirection: 'row', alignItems: 'center', height: 24 },
  timelineDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  timelineLine: { position: 'absolute', left: 4, top: 24, width: 2, height: 16 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  photoThumb: { width: 72, height: 72, borderRadius: 10, borderWidth: 1, marginRight: 8 },
  verifySection: { borderRadius: 16, borderWidth: 1, padding: 16 },
  verifyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  photoPreviewRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8 },
  photoButtonsRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  photoButton: { flexDirection: 'row', alignItems: 'center', height: 40, paddingHorizontal: 14, borderWidth: 1, borderRadius: 12 },
  totalBackdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', padding: 24 },
  totalCard: { width: '100%', maxWidth: 280, borderWidth: 1, borderRadius: 16, padding: 24 },
});
