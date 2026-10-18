import { StyleSheet, Text, View } from 'react-native';
import { useAppTheme } from '@/shared/theme';
import { BRANCH_STRIP_FONT_SIZE, BRANCH_STRIP_HEIGHT, ROW_HORIZONTAL_PADDING } from './drawerLayout';

export interface BranchStripProps {
  branchName: string;
}

/**
 * The role shell's context line (the branch, or "Production · All branches")
 * as a 40dp band on `colors.surface`, text in the accent. A label, not a
 * picker: `SessionUser.branchId`/`branchName` are singular, with no
 * multi-branch switching anywhere in the data model.
 */
export function BranchStrip({ branchName }: BranchStripProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.strip, { height: BRANCH_STRIP_HEIGHT, paddingHorizontal: ROW_HORIZONTAL_PADDING, backgroundColor: theme.colors.surface }]}>
      <Text
        style={{ color: theme.colors.primary, fontSize: BRANCH_STRIP_FONT_SIZE, fontWeight: '600' }}
        numberOfLines={1}
        ellipsizeMode="tail"
        maxFontSizeMultiplier={1.2}>
        {branchName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: { justifyContent: 'center' },
});
