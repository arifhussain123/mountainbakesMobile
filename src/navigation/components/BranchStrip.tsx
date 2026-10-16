import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';

export interface BranchStripProps {
  branchName: string;
}

/**
 * Full-width band naming the signed-in branch. No chevron/picker — confirmed
 * in Step 0 that `SessionUser.branchId`/`branchName` are singular fields, not
 * arrays; there is no multi-branch switching anywhere in this app's data
 * model, so this is a label, not a control.
 */
export function BranchStrip({ branchName }: BranchStripProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.strip, { backgroundColor: theme.colors.drawer.branchBg }]}>
      <Text style={[theme.typography.body, { color: theme.colors.primary, fontWeight: '600' }]} numberOfLines={1}>
        {branchName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { height: 44, justifyContent: 'center', paddingHorizontal: 20 },
});
