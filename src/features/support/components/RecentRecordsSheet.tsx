import { forwardRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { EmptyState, FormBottomSheet, ListThumb } from '@/shared/ui';
import { formatDisplayDate } from '@/shared/utils';
import { useRecentRecords, type RecentRecordOption } from '../hooks/useRecentRecords';

export interface RecentRecordsSheetProps {
  onPick: (referenceId: string) => void;
  onRequestClose: () => void;
}

/** "Pick from recent" — the user's own recent sales/demands/expenses/deposits, read from cache (see `useRecentRecords`), so they can tap instead of typing an id. */
export const RecentRecordsSheet = forwardRef<BottomSheetModal, RecentRecordsSheetProps>(({ onPick, onRequestClose }, ref) => {
  const theme = useAppTheme();
  const options = useRecentRecords();

  return (
    <FormBottomSheet ref={ref} title="Pick from recent" onRequestClose={onRequestClose} snapPoints={['70%']}>
      {options.length === 0 ? (
        <EmptyState title="Nothing recent yet" message="Open Sales, Orders, Shop Expenses or Cash Deposits first — recent records will show up here." />
      ) : (
        options.map((option: RecentRecordOption, index) => (
          <Pressable
            key={option.referenceId}
            accessibilityRole="button"
            accessibilityLabel={`${option.referenceId}, ${option.subtitle}`}
            onPress={() => onPick(option.referenceId)}
            style={[styles.li, index > 0 && { borderTopWidth: 1, borderTopColor: theme.colors.border }]}>
            <ListThumb icon={option.icon} index={index} />
            <View style={styles.grow}>
              <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={1}>
                {option.referenceId}
              </Text>
              <Text style={[styles.xs, { color: theme.colors.textSecondary }]} numberOfLines={1}>
                {option.subtitle}
              </Text>
            </View>
            <Text style={[styles.xs, { color: theme.colors.textFaint }]}>{formatDisplayDate(option.date)}</Text>
          </Pressable>
        ))
      )}
    </FormBottomSheet>
  );
});

const styles = StyleSheet.create({
  li: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44, paddingVertical: 12 },
  grow: { flex: 1, minWidth: 0, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  xs: { fontSize: 12, lineHeight: 16, fontWeight: '500' },
});
