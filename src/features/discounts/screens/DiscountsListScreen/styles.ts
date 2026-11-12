import { StyleSheet } from 'react-native';
import { FAB_CLEARANCE } from '@/shared/ui';

export const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: FAB_CLEARANCE + 12 },
  header: { gap: 16, marginBottom: 16 },
  grow: { flex: 1, minWidth: 0 },
  fieldLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  fieldInput: { height: 52, borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 },
  fieldValue: { flex: 1, fontSize: 16, fontWeight: '500' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sortChip: { height: 44, borderRadius: 22, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  sortText: { fontSize: 13, fontWeight: '600' },
  activeFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  activeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28, paddingHorizontal: 10, borderRadius: 14 },
  offlinePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, alignSelf: 'flex-start' },
});
