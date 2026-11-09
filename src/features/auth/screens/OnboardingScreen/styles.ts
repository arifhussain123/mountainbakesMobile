import { StyleSheet } from 'react-native';

/** The Skip link's row (44dp touch target) plus its top margin — collapses to 0 on the last page. */
export const SKIP_SLOT_HEIGHT = 44;

export const styles = StyleSheet.create({
  pager: { flex: 1 },
  bottom: { paddingHorizontal: 26, paddingBottom: 12, gap: 16 },
  skipSlot: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  skip: {
    height: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
