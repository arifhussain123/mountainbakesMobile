import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  tilesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', borderWidth: 1 },
  tileDotRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tileDot: { width: 7, height: 7, borderRadius: 2 },
  banner: { flexDirection: 'row', gap: 9, borderWidth: 1 },
  dateChip: { height: 38, borderWidth: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  offlinePill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  aggregateCard: { borderWidth: 1, flexDirection: 'row', flexWrap: 'wrap' },
  aggregateItem: { width: '50%' },
});
