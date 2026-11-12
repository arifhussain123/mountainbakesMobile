import { StyleSheet } from 'react-native';
import { FAB_CLEARANCE } from '@/features/sales/components';

export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: FAB_CLEARANCE + 12 },
  header: { gap: 16, marginBottom: 16 },
  queued: { gap: 8 },
  queuedTitle: { fontSize: 13, fontWeight: '700' },
  offlinePill: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  fieldInput: { height: 52, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldValue: { flex: 1, fontSize: 16, fontWeight: '500' },
});
