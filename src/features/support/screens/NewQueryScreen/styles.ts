import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  refRow: { flexDirection: 'row', gap: 8 },
  refInput: { flex: 1, height: 46, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 },
  lookupButton: { paddingHorizontal: 16, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  referencePreview: { borderRadius: 16, borderWidth: 1, padding: 14, marginTop: 10 },
  messageInput: { minHeight: 90, borderWidth: 1, borderRadius: 14, padding: 12, textAlignVertical: 'top' },
});
