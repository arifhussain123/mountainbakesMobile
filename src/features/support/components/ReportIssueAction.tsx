import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { openNewQuery } from '@/navigation';
import { useAppTheme } from '@/shared/theme';
import { Icon } from '@/shared/ui';

export interface ReportIssueActionProps {
  /**
   * The record's own synced reference ID (`MB-…`/`DMD-…`/`EXP-…`/`STK-…`/`CT-…`),
   * or `null` when the record only exists locally and has no server-assigned
   * number yet (still sitting in the offline write queue). A plain secondary
   * button with a flag icon, not an overflow menu — agreed with mountainbakes-d9
   * earlier this session to avoid introducing a new menu pattern just for this.
   */
  referenceId: string | null;
}

export function ReportIssueAction({ referenceId }: ReportIssueActionProps) {
  const theme = useAppTheme();

  const handlePress = () => {
    if (!referenceId) {
      Alert.alert('Sync this record first', "This record hasn't synced to the server yet, so it has no ID to report against. Try again once it's synced.");
      return;
    }
    openNewQuery(referenceId);
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={referenceId ? `Report an issue with ${referenceId}` : 'Report an issue — sync this record first'}
      onPress={handlePress}
      style={[styles.button, { borderColor: theme.colors.border, borderRadius: theme.radii.md }]}>
      <Icon name="flag" size={16} color={theme.colors.textSecondary} />
      <Text style={[theme.typography.bodySmall, { color: theme.colors.textSecondary, fontWeight: '600', marginLeft: 8 }]}>
        Report an issue
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
});
