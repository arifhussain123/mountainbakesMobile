import { StyleSheet, Text } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { BRANCH_LINE_FONT_SIZE } from './drawerLayout';

export interface BranchStripProps {
  branchName: string;
}

/**
 * The signed-in branch's name, in `colors.primary` (the brief's "colors.accent"
 * — this app's actual accent token), on its own line under the header. No
 * chevron/picker: `SessionUser.branchId`/`branchName` are singular fields —
 * confirmed in an earlier pass that there is no multi-branch switching
 * anywhere in this app's data model, so a chevron (only for that case, per
 * the brief) never applies here.
 */
export function BranchStrip({ branchName }: BranchStripProps) {
  const theme = useAppTheme();
  return (
    <Text
      style={[styles.text, { color: theme.colors.primary, fontSize: BRANCH_LINE_FONT_SIZE, marginBottom: theme.spacing.md }]}
      numberOfLines={1}
      ellipsizeMode="tail">
      {branchName}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: { paddingHorizontal: 20, fontWeight: '700' },
});
