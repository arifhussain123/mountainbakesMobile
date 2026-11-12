import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1 },
  rangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  rangeText: { flexShrink: 1, fontSize: 13, fontWeight: '600' },
  rangeChange: { fontSize: 13, fontWeight: '600' },
});
