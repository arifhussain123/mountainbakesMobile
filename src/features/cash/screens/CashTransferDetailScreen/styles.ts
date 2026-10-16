import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  finalRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  photoFrame: { height: 220, borderWidth: 1, overflow: 'hidden' },
  photoImage: { width: '100%', height: '100%' },
  photoPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
