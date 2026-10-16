import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { BRANCH_STRIP_FONT_SIZE, BRANCH_STRIP_HEIGHT } from './drawerLayout';

export interface BranchStripProps {
  branchName: string;
}

/**
 * Full-width band naming the signed-in branch. No chevron/picker — confirmed
 * in Step 0 that `SessionUser.branchId`/`branchName` are singular fields, not
 * arrays; there is no multi-branch switching anywhere in this app's data
 * model, so this is a label, not a control.
 *
 * `colors.surface` + a hairline border below, same chrome as the header —
 * replacing the old deep-brown `drawer.branchBg` token.
 */
export function BranchStrip({ branchName }: BranchStripProps) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.strip,
        {
          height: BRANCH_STRIP_HEIGHT,
          paddingHorizontal: theme.spacing.lg,
          backgroundColor: theme.colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.border,
        },
      ]}>
      <Text style={{ color: theme.colors.primary, fontSize: BRANCH_STRIP_FONT_SIZE, fontWeight: '600' }} numberOfLines={1}>
        {branchName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { justifyContent: 'center' },
});
