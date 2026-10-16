import { forwardRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAppTheme } from '@/shared/theme';
import { EmptyState, FormBottomSheet, Icon } from '@/shared/ui';
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
        options.map((option: RecentRecordOption) => (
          <Pressable
            key={option.referenceId}
            accessibilityRole="button"
            accessibilityLabel={`${option.referenceId}, ${option.subtitle}`}
            onPress={() => onPick(option.referenceId)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              minHeight: 44,
              paddingVertical: 10,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}>
            <Icon name={option.icon} size={18} color={theme.colors.textSecondary} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[theme.typography.body, { color: theme.colors.text, fontWeight: '700' }]}>{option.referenceId}</Text>
              <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, marginTop: 2 }]}>{option.subtitle}</Text>
            </View>
            <Text style={[theme.typography.label, { color: theme.colors.textFaint }]}>{formatDisplayDate(option.date)}</Text>
          </Pressable>
        ))
      )}
    </FormBottomSheet>
  );
});
