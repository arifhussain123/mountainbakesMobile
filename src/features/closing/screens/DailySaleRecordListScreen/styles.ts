import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  totalCard: { borderRadius: 22, padding: 16 },
  totalsGrid: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  headerActionsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
  headerPill: { height: 34, paddingHorizontal: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleBlock: { marginTop: 4 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', borderWidth: 1 },
  tileDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDot: { width: 7, height: 7, borderRadius: 2 },
  banner: { flexDirection: 'row', gap: 9, borderWidth: 1 },
  dateRangeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dateRangeField: { flex: 1 },
  filtersRow: { flexDirection: 'row', gap: 6 },
  filterChip: { height: 32, paddingHorizontal: 12, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1 },
  aggregateCard: { borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap' },
  aggregateItem: { width: '50%' },
});
